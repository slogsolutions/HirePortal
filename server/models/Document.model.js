const mongoose = require('mongoose');

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
// band details , pan no. , if (PF ||ESIC)  , IF(MEDIC POLICY) comapny , number 
// Employ code 

module.exports = mongoose.model('Document', docSchema);
