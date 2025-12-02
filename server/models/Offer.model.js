// models/Offer.js
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  createdBy: { type: mongoose.Types.ObjectId, ref: 'User' },
  designation: { type: String },
  ctc: { type: String }, // string so you can store ranges/currency text
  joiningDate: { type: Date },
  offerLetterUrl: { type: String }, // URL or storage path to generated PDF
  status: { type: String, enum: ['generated','sent','accepted','rejected'], default: 'generated' },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', offerSchema);
