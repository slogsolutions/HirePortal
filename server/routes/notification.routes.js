const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} = require('../controllers/notification.controller');

// Get notifications for user
router.get('/notifications', protect, getNotifications);

// Get unread count
router.get('/notifications/unread-count', protect, getUnreadCount);

// Mark notification as read
router.patch('/notifications/:id/read', protect, markAsRead);

// Mark all as read
router.patch('/notifications/read-all', protect, markAllAsRead);

// Delete notification
router.delete('/notifications/:id', protect, deleteNotification);

// Delete all read notifications
router.delete('/notifications/read', protect, deleteAllRead);

module.exports = router;

