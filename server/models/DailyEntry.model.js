const mongoose = require('mongoose');

const DailyEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true }, // stored at 00:00:00 UTC
  tag: {
    type: String,
    enum: ['Working','On Leave','Holiday','Missed'],
    required: true
  },
  note: { type: String, default: '' },
  autoMarked: { type: Boolean, default: false }, // true if system marks as Missed/Absent
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// unique per user per day
DailyEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

// update timestamp
DailyEntrySchema.pre('save', function(next){
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('DailyEntry', DailyEntrySchema);
