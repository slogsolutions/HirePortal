const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  company: { type: mongoose.Types.ObjectId, ref: 'Company' },
  name: String,
  email: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ['admin','hr','manager','employee'], default: 'employee' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
