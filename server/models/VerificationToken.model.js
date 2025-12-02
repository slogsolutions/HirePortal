// models/VerificationToken.js
const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  type: { type: String, enum: ['mobile','email','aadhaar'], required: true },
  code: { type: String, required: true }, // store as string to preserve leading zeros
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
});

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
