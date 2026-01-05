const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification.model');

/**
 * Get all notifications for the authenticated user
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: 'User ID required' });
  }

  const { read, limit = 50, page = 1 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { userId };
  if (read !== undefined) {
    query.read = read === 'true';
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .populate('sentBy', 'name email')
    .lean();

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ userId, read: false });

  res.json({
    success: true,
    data: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    },
    unreadCount
  });
});

/**
 * Get unread notification count
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: 'User ID required' });
  }

  const count = await Notification.countDocuments({ userId, read: false });

  res.json({ success: true, count });
});

/**
 * Mark notification as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.body.userId;

  if (!userId) {
    return res.status(400).json({ message: 'User ID required' });
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json({ success: true, data: notification });
});

/**
 * Mark all notifications as read for a user
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  if (!userId) {
    return res.status(400).json({ message: 'User ID required' });
  }

  const result = await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );

  res.json({ 
    success: true, 
    message: `Marked ${result.modifiedCount} notifications as read` 
  });
});

/**
 * Delete a notification
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.body.userId;

  if (!userId) {
    return res.status(400).json({ message: 'User ID required' });
  }

  const notification = await Notification.findOneAndDelete({ _id: id, userId });

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  res.json({ success: true, message: 'Notification deleted' });
});

/**
 * Delete all read notifications for a user
 */
exports.deleteAllRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  if (!userId) {
    return res.status(400).json({ message: 'User ID required' });
  }

  const result = await Notification.deleteMany({ userId, read: true });

  res.json({ 
    success: true, 
    message: `Deleted ${result.deletedCount} read notifications` 
  });
});

