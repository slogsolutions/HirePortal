const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: String,
  domain: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Company', companySchema);
