
//comapny logo , employee code 


You want a walk-in candidate flow (no invites): candidate arrives at reception → receptionist enters basic details → candidate verifies mobile (and father's mobile) by OTPs → candidate proceeds to 3 interview rounds (HR, Technical, Founder) and each interviewer submits a score → candidate uploads documents (photo, Aadhaar, driving license) and those docs get verified (preferably via a vetted eKYC/DigiLocker provider — more on legal constraints below) → system aggregates scores and (based on your rules) auto-generates an offer letter (PDF) which HR can email/save → followed by onboarding pages like company rules/updates.

Below I’ll give you:

A concise end-to-end flow (who does what, state transitions).

Concrete data model changes (Mongoose schema additions / fields).

Exact API endpoints you need (request/response shape).

Business rules / score decision logic examples.

Document verification & Aadhaar notes (legal/compliance + recommended approach).

Offer generation details & template placeholders.

Minimal UI/UX notes for reception and interviewers.

Next step: I’ll produce the backend code (models + controllers + routes) that you can drop into your MERN project — local-first (files stored locally in /uploads/) and optional S3 later.

If you want the full ready-to-paste backend code now, I’ll generate it next (models + controllers + routes + utils). I’ll assume local file storage initially — tell me only if you must use S3 now (otherwise local is faster to test). Otherwise I’ll proceed with local-first code.


____________________________________PROMPT for backend complete and asked for frontend 


no first understand what i asked to do my backend is ready and completed with  auth controller const asyncHandler = require('express-async-handler');
const Otp = require('../models/Otp.model');
const Candidate = require('../models/Candidate.model');
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendSmsPlain } = require('../utils/sms.utils');

const OTP_EXP_MIN = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');

const sendOtp = asyncHandler(async (req, res) => {
  const { mobile, type } = req.body;
  if (!mobile) return res.status(400).json({ message: 'mobile required' });
  const code = (Math.floor(100000 + Math.random()*900000)).toString();
  const expiresAt = new Date(Date.now() + OTP_EXP_MIN*60*1000);
  await Otp.create({ mobile, code, type, expiresAt });
  await sendSmsPlain(mobile, `Your OTP is ${code}. It expires in ${OTP_EXP_MIN} minutes.`);
  res.json({ message: 'OTP sent' });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, code, type } = req.body;
  const otp = await Otp.findOne({ mobile, code, type, verified: false }).sort({ createdAt: -1 });
  if (!otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (otp.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
  otp.verified = true;
  await otp.save();

  await Candidate.updateOne({ mobile }, { mobileVerified: true });
  await Candidate.updateOne({ fatherMobile: mobile }, { fatherMobileVerified: true });

  const token = jwt.sign({ mobile, type }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.json({ token, message: 'OTP verified' });
});

const login = asyncHandler(async (req, res) => {

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });


});

module.exports = { sendOtp, verifyOtp, login }; then candidate controller const asyncHandler = require('express-async-handler');
const Candidate = require('../models/Candidate.model');
const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const fs = require('fs');
const path = require('path');
const { saveFileLocal } = require('../utils/storage.utils');

const createCandidate = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, mobile, fatherName, fatherMobile, dob, position } = req.body;
  const candidate = await Candidate.create({ firstName, lastName, email, mobile, fatherName, fatherMobile, dob, status: 'applied' });
  await AuditLog.create({ actor: req.user._id, action: 'reception_created', details: { candidateId: candidate._id } });
  res.json(candidate);
});

const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).populate('documents');
  if (!candidate) return res.status(404).json({ message: 'Not found' });
  res.json(candidate);
});

const uploadDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  const { type } = req.body;
  if (!file) return res.status(400).json({ message: 'file required' });
  const destPath = await saveFileLocal(file, id);
  const doc = await Document.create({ candidate: id, type: type || 'other', fileUrl: destPath, status: 'pending' });
  await Candidate.findByIdAndUpdate(id, { $push: { documents: doc._id } });
  await AuditLog.create({ actor: req.user._id, action: 'document_uploaded', details: { candidateId: id, docId: doc._id } });
  res.json(doc);
});

const listDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ candidate: req.params.id });
  res.json(docs);
});

module.exports = { createCandidate, getCandidate, uploadDocument, listDocuments };
                 then offer controller const asyncHandler = require('express-async-handler');
const Candidate = require('../models/Candidate.model');
const Offer = require('../models/Offer.model');
const AuditLog = require('../models/AuditLog.model');
const { renderOfferPdf } = require('../utils/pdf.utils');
const fs = require('fs');
const path = require('path');
const { uploadToS3IfConfigured } = require('../utils/storage.utils');
const { sendMail } = require('../utils/email.utils');

const generateOffer = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  const { ctc, position, joiningDate, probationMonths, templateName='default' } = req.body;
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

  const data = {
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    position,
    ctc,
    joiningDate: joiningDate || new Date().toISOString().split('T')[0],
    probationMonths: probationMonths || 0,
    companyName: 'Your Company Name',
    hrName: req.user?.name || 'HR Team',
    candidate_mobile: candidate.mobile,
    father_name: candidate.fatherName,
    aadhaar_masked: candidate.aadhaarData?.masked || ''
  };

  const pdfBuffer = await renderOfferPdf(templateName, data);
  const filename = `offer_${candidate._id}_${Date.now()}.pdf`;
  const outPathLocal = path.join(process.cwd(), 'uploads', 'offers');
  if (!fs.existsSync(outPathLocal)) fs.mkdirSync(outPathLocal, { recursive: true });
  const outPath = path.join(outPathLocal, filename);
  fs.writeFileSync(outPath, pdfBuffer);

  const s3Result = await uploadToS3IfConfigured(outPath, `offers/${filename}`);
  let url = `/uploads/offers/${filename}`;
  if (s3Result && s3Result.Location) url = s3Result.Location;

  const offer = await Offer.create({ candidate: candidateId, templateName, ctc, position, joiningDate, probationMonths, generatedPdfUrl: url, status: 'draft' });
  await AuditLog.create({ actor: req.user._id, action: 'offer_generated', details: { candidateId, offerId: offer._id } });
  res.json(offer);
});

const sendOffer = asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  const offer = await Offer.findById(offerId).populate('candidate');
  if (!offer) return res.status(404).json({ message: 'Not found' });
  const candidate = offer.candidate;
  const subject = `Offer Letter - ${offer.position} - ${candidate.firstName}`;
  const html = `<p>Dear ${candidate.firstName},</p><p>Please find attached your offer letter.</p>`;
  await sendMail({ to: candidate.email || '', subject, html, attachments: [{ filename: 'offer.pdf', path: offer.generatedPdfUrl }] });
  offer.status = 'sent';
  offer.sentAt = new Date();
  await offer.save();
  await AuditLog.create({ actor: req.user._id, action: 'offer_sent', details: { offerId } });
  res.json({ message: 'Offer sent' });
});

const updateOfferStatus = asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  const { status } = req.body;
  const offer = await Offer.findById(offerId);
  if (!offer) return res.status(404).json({ message: 'Not found' });
  offer.status = status;
  if (status === 'accepted') offer.acceptedAt = new Date();
  await offer.save();
  await AuditLog.create({ actor: req.user._id, action: 'offer_status_changed', details: { offerId, status } });
  if (status === 'accepted') {
    await Candidate.findByIdAndUpdate(offer.candidate, { status: 'accepted' });
  }
  res.json(offer);
});

module.exports = { generateOffer, sendOffer, updateOfferStatus }; then score controller const asyncHandler = require('express-async-handler');
const Score = require('../models/Score.model');
const Candidate = require('../models/Candidate.model');
const AuditLog = require('../models/AuditLog.model');

function computeWeighted(summary) {
  const hr = summary.hr?.score || 0;
  const tech = summary.technical?.score || 0;
  const founder = summary.founder?.score || 0;
  // calculate digit-by-digit: but simple arithmetic is fine here
  const weighted = (tech * 0.5) + (hr * 0.3) + (founder * 0.2);
  return Math.round(weighted * 100) / 100; // round to 2 decimals
}

/**
 * submitScore
 * - Creates a Score document
 * - Updates Candidate.scoresSummary.<round> with latest data
 * - Recomputes weightedAvg and optionally updates candidate.status
 */
const submitScore = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  const { round, score, comments } = req.body;

  if (!['hr','technical','founder'].includes(round)) {
    return res.status(400).json({ message: 'Invalid round' });
  }
  if (typeof score !== 'number') {
    return res.status(400).json({ message: 'score must be a number' });
  }

  // create score doc
  const s = await Score.create({
    candidate: candidateId,
    round,
    score,
    comments: comments || '',
    interviewer: req.user._id
  });

  // update candidate summary (latest)
  const update = {};
  update[`scoresSummary.${round}`] = {
    score,
    comments: comments || '',
    by: req.user._id,
    at: new Date()
  };

  await Candidate.findByIdAndUpdate(candidateId, { $set: update });

  // recompute weighted average using fresh candidate doc
  const candidate = await Candidate.findById(candidateId);
  candidate.scoresSummary.weightedAvg = computeWeighted(candidate.scoresSummary || {});
  // example rule: if weightedAvg >= 70 then mark 'offered' (you may change this)
  if (candidate.scoresSummary.weightedAvg >= 70) candidate.status = 'offered';
  await candidate.save();

  await AuditLog.create({
    actor: req.user._id,
    action: 'score_submitted',
    details: { candidateId, round, score, scoreDocId: s._id }
  });

  res.json({ score: s, weightedAvg: candidate.scoresSummary.weightedAvg });
});

/**
 * getScoresForCandidate
 * - returns all Score documents for a candidate (history)
 */
const getScoresForCandidate = asyncHandler(async (req, res) => {
  const candidateId = req.params.candidateId;
  const scores = await Score.find({ candidate: candidateId })
    .populate('interviewer', 'name email role')
    .sort({ createdAt: 1 });
  res.json(scores);
});

module.exports = { submitScore, getScoresForCandidate };
    midddlware const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User.model');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ message: 'Not authorized' });

  req.user = user;
  next();
});

module.exports = { protect };  and roles based function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

module.exports = { requireRole };   now the models are const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  actor: { type: mongoose.Types.ObjectId, ref: 'User' },
  action: String,
  details: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', logSchema);

//Tracking user logins and logouts
// Recording CRUD operations (create/update/delete actions)
// Monitoring admin activity
// Building a security audit trail   then candidate const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  company: { type: mongoose.Types.ObjectId, ref: 'Company' },
  firstName: String,
  lastName: String,
  email: String,
  mobile: String,
  mobileVerified: { type: Boolean, default: false },
  fatherName: String,
  fatherMobile: String,
  fatherMobileVerified: { type: Boolean, default: false },
  dob: Date,
  photoUrl: String,
  aadhaarData: { type: Object, default: null },
  documents: [{ type: mongoose.Types.ObjectId, ref: 'Document' }],
  status: { type: String, enum: ['applied','verifying','interviewing','offered','accepted','rejected'], default: 'applied' },
  scoresSummary: {
    hr: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    technical: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    founder: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    weightedAvg: Number
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema); company const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: String,
  domain: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema); then document const mongoose = require('mongoose');

const docSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate' },
  type: { type: String, enum: ['aadhaar_front','aadhaar_back','driving_license','photo','resume','other'] },
  fileUrl: String,
  status: { type: String, enum: ['uploaded','pending','verified','rejected'], default: 'uploaded' },
  verifiedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  meta: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', docSchema);
   offer const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate' },
  templateName: String,
  ctc: Number,
  position: String,
  joiningDate: Date,
  probationMonths: Number,
  generatedPdfUrl: String,
  status: { type: String, enum: ['draft','sent','accepted','rejected'], default: 'draft' },
  sentAt: Date,
  acceptedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', offerSchema); then otp const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  mobile: String,
  code: String,
  type: { type: String, enum: ['candidate','father'] },
  expiresAt: Date,
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Otp', otpSchema);   then score // models/Score.js
const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  round: { type: String, enum: ['hr','technical','founder'], required: true },
  score: { type: Number, required: true },            // numeric score (e.g. 0-100)
  maxScore: { type: Number, default: 100 },           // optional max scale
  comments: { type: String, default: '' },
  interviewer: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// optional: prevent duplicate submissions by same interviewer for same round (if desired)
// scoreSchema.index({ candidate: 1, round: 1, interviewer: 1 }, { unique: true });

module.exports = mongoose.model('Score', scoreSchema);
 
 then the User model const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  company: { type: mongoose.Types.ObjectId, ref: 'Company' },
  name: String,
  email: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ['admin','hr','reception','interviewer'], default: 'hr' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
 routes are const express = require('express');
const { sendOtp, verifyOtp, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/login', login);

module.exports = router;
 const express = require('express');
const multer = require('multer');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const { createCandidate, getCandidate, uploadDocument, listDocuments } = require('../controllers/candidate.controller');

const router = express.Router();
const upload = multer({ dest: 'uploads/tmp/' });

// create candidate at reception
router.post('/', protect, requireRole(['reception','hr','admin']), createCandidate);
router.get('/:id', protect, getCandidate);
router.post('/:id/documents', protect, upload.single('file'), uploadDocument);
router.get('/:id/documents', protect, listDocuments);

module.exports = router;          const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const { generateOffer, sendOffer, updateOfferStatus } = require('../controllers/offer.controller');

const router = express.Router();

router.post('/generate/:candidateId', protect, requireRole(['hr','admin']), generateOffer);
router.post('/send/:offerId', protect, requireRole(['hr','admin']), sendOffer);
router.patch('/:offerId/status', protect, requireRole(['hr','admin','reception']), updateOfferStatus);

module.exports = router;    and const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const { submitScore, getScoresForCandidate } = require('../controllers/score.controller.js');

const router = express.Router();

router.post('/:candidateId', protect, requireRole(['interviewer','hr','admin']), submitScore);
router.get('/:candidateId', protect, requireRole(['hr','admin','interviewer']), getScoresForCandidate);

module.exports = router;
 template <!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Offer Letter</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.4; padding: 30px; color: #111; }
    header { text-align:center; margin-bottom:20px; }
    .content { margin-top: 20px; }
  </style>
</head>
<body>
  <header>
    <h2>{{companyName}}</h2>
    <p>Offer Letter</p>
  </header>
  <div class="content">
    <p>Dear {{candidateName}},</p>
    <p>We are pleased to offer you the position of <strong>{{position}}</strong> at {{companyName}}.</p>
    <p>Your CTC will be ₹{{ctc}} per annum. Expected joining date: {{joiningDate}}. Probation: {{probationMonths}} months.</p>
    <p>Candidate mobile: {{candidate_mobile}} | Father's name: {{father_name}} | Aadhaar: {{aadhaar_masked}}</p>
    <p>Please review and confirm.</p>
    <p>Sincerely,<br/>{{hrName}}</p>
  </div>
</body>
</html>
  const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendMail({ to, subject, html, attachments=[] }) {
  const from = process.env.FROM_EMAIL;
  const info = await transporter.sendMail({ from, to, subject, html, attachments });
  return info;
}

module.exports = { sendMail }; email  pdf const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function renderOfferPdf(templateName, data) {
  const tplPath = path.join(process.cwd(), 'templates', 'offerTemplate.html');
  let html = fs.readFileSync(tplPath, 'utf8');
  Object.keys(data).forEach(k => {
    const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
    html = html.replace(re, data[k] || '');
  });

  const launchOptions = { args: ['--no-sandbox','--disable-setuid-sandbox'] };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm' } });
  await browser.close();
  return pdfBuffer;
}

module.exports = { renderOfferPdf }; // stub - replace with Twilio/MSG91 integration
async function sendSmsPlain(mobile, text) {
  console.log(`SMS to ${mobile}: ${text}`);
  return true;
}

module.exports = { sendSmsPlain };
 sms const fs = require('fs');
const path = require('path');
// const AWS = require('aws-sdk');

async function saveFileLocal(file, candidateId) {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'candidates', candidateId.toString());
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const ext = (file.originalname || '').split('.').pop();
  const filename = `${Date.now()}_${file.filename || Math.random().toString(36).slice(2)}.${ext}`;
  const dest = path.join(uploadsDir, filename);
  fs.renameSync(file.path, dest);
  return `/uploads/candidates/${candidateId}/${filename}`;
}

async function uploadToS3IfConfigured(localFilePath, keyName) {
  if (!process.env.AWS_S3_BUCKET) return null;
  const s3 = new AWS.S3({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION });
  const fileContent = fs.readFileSync(localFilePath);
  const params = { Bucket: process.env.AWS_S3_BUCKET, Key: keyName, Body: fileContent, ACL: 'private' };
  return s3.upload(params).promise();
}

module.exports = { saveFileLocal, uploadToS3IfConfigured };
 storage for now utils so  now give me  const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

const db = require("./config/db.config")
dotenv.config();

const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidates.routes');
const scoreRoutes = require('./routes/scores.routes');
const offerRoutes = require('./routes/offers.routes');

const AllowedOrigin = [process.env.FRONTEND_URL,process.env.DEV_URL,"*"]


const app = express();
app.use(cors({
    origin : AllowedOrigin,
    methods : ["POST","GET","PATCH","PUT","DELETE"]
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// mongoose.connect(process.env.MONGO_URL, { })
//   .then(() => console.log('Mongo connected'))
//   .catch(err => { console.error(err); process.exit(1); });

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/offers', offerRoutes);

// serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (_, res) => res.json({ message: 'HirePortal backend running' }));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
 give me ui for this backend  and also the front should be in react js where  hompage about login page where login page will be like  right like this and then the dashboard from where its all work but the ui must be professional and mdoern  and  my company ready  





 ______________________________________________________________