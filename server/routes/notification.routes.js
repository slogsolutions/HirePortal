const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} = require('../controllers/notification.controller');

// Get notifications for user
router.get('/notifications', getNotifications);

// Get unread count
router.get('/notifications/unread-count', getUnreadCount);

// Mark notification as read
router.patch('/notifications/:id/read', markAsRead);

// Mark all as read
router.patch('/notifications/read-all', markAllAsRead);

// Delete notification
router.delete('/notifications/:id', deleteNotification);

// Delete all read notifications
router.delete('/notifications/read', deleteAllRead);

module.exports = router;

