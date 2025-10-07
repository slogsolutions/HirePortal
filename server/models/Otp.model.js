const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  mobile: String,
  code: String,
  type: { type: String, enum: ['candidate','father'] },
  expiresAt: Date,
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Otp', otpSchema);
