const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', default: null },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, default: 0 },
  reason: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  comment: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

// Calculate leave days automatically
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    if (this.endDate < this.startDate) {
      return next(new Error('endDate must be after startDate'));
    }
    const oneDay = 24 * 60 * 60 * 1000;
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    this.days = Math.round((end - start) / oneDay) + 1;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);
