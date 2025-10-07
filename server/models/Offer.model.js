const mongoose = require('mongoose');

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

module.exports = mongoose.model('Offer', offerSchema);
