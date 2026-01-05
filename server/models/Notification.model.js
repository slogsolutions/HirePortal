const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      index: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    body: { 
      type: String, 
      required: true 
    },
    tag: { 
      type: String, 
      default: 'default_notification',
      index: true 
    },
    read: { 
      type: Boolean, 
      default: false,
      index: true 
    },
    readAt: { 
      type: Date 
    },
    data: { 
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);

