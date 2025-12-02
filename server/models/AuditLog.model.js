const mongoose = require('mongoose');

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
// Building a security audit trail