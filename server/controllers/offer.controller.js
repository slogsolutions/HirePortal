const asyncHandler = require('express-async-handler');
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

module.exports = { generateOffer, sendOffer, updateOfferStatus };
