// controllers/verificationController.js
const Candidate = require('../models/Candidate.model');
const VerificationToken = require('../models/VerificationToken.model');
const crypto = require('crypto');

const OTP_TTL_MINUTES = 10;

function genOtp() {
  // 6-digit numeric OTP
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.sendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'mobile' or 'email' or 'aadhaar'
    if (!['mobile','email','aadhaar'].includes(type)) return res.status(400).json({ message: 'Invalid type' });

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const contact = type === 'mobile' ? candidate.mobile : type === 'email' ? candidate.email : candidate.aadhaarNumber;
    if (!contact) return res.status(400).json({ message: `No ${type} available on candidate` });

    // create token
    const code = genOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await VerificationToken.create({ candidate: candidate._id, type, code, expiresAt });

    // TODO: integrate SMS/Email provider; here we just log for development
    console.log(`SEND OTP ${code} to candidate(${id}) ${type}: ${contact}`);

    res.json({ message: 'OTP sent (simulated)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

exports.confirmOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, otp } = req.body;
    if (!otp || !type) return res.status(400).json({ message: 'Missing otp/type' });

    const token = await VerificationToken.findOne({
      candidate: id,
      type,
      code: String(otp),
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!token) return res.status(400).json({ message: 'Invalid or expired OTP' });

    token.used = true;
    await token.save();

    // update candidate field
    const update = {};
    if (type === 'mobile') update.mobileVerified = true;
    else if (type === 'email') update.emailVerified = true;
    else if (type === 'aadhaar') update.aadhaarVerified = true;

    await Candidate.findByIdAndUpdate(id, update, { new: true });

    res.json({ message: `${type} verified` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'OTP confirmation failed' });
  }
};

// manual verify route - simply mark fields verified (used when verifying physically)
exports.manualVerify = async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body; // 'mobile'|'email'|'aadhaar'
    if (!['mobile','email','aadhaar','fatherMobile'].includes(field)) return res.status(400).json({ message: 'Invalid field' });

    const update = {};
    if (field === 'mobile') update.mobileVerified = true;
    if (field === 'email') update.emailVerified = true;
    if (field === 'aadhaar') update.aadhaarVerified = true;
    if (field === 'fatherMobile') update.fatherMobileVerified = true;

    const candidate = await Candidate.findByIdAndUpdate(id, update, { new: true });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    res.json({ message: `${field} marked verified`, candidate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Manual verify failed' });
  }
};
