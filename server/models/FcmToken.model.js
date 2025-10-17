const mongoose = require('mongoose');

const FcmTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, index: true },
    platform: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
    userAgent: { type: String },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

FcmTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('FcmToken', FcmTokenSchema);


