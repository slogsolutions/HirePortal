const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification.model');

/**
 * Get all notifications for the authenticated user
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    console.log('[Notifications] ❌ No authenticated user found');
    return res.status(401).json({ message: 'Authentication required' });
  }

  console.log('[Notifications] 🔍 Getting notifications for user:', userId.toString());
  console.log('[Notifications] 🔍 User object:', {
    id: req.user._id?.toString(),
    email: req.user.email,
    name: req.user.name,
    role: req.user.role
  });

  const { read, limit = 50, page = 1 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { userId };
  if (read !== undefined) {
    query.read = read === 'true';
  }

  console.log('[Notifications] 🔍 Query:', query);
  console.log('[Notifications] 🔍 Query params:', { read, limit, page, skip });

  try {
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('sentBy', 'name email')
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    console.log(`[Notifications] ✅ Found ${notifications.length} notifications, ${unreadCount} unread, ${total} total`);
    console.log('[Notifications] 📋 Sample notifications:', notifications.slice(0, 3).map(n => ({
      id: n._id.toString(),
      userId: n.userId.toString(),
      title: n.title,
      read: n.read,
      createdAt: n.createdAt
    })));

    // Additional debugging: Check if there are any notifications for this user at all
    const allUserNotifications = await Notification.find({ userId }).select('_id title read createdAt').lean();
    console.log(`[Notifications] 🔍 Total notifications for user ${userId}: ${allUserNotifications.length}`);
    
    if (allUserNotifications.length > 0) {
      console.log('[Notifications] 📋 All user notifications:', allUserNotifications.map(n => ({
        id: n._id.toString(),
        title: n.title,
        read: n.read,
        createdAt: n.createdAt
      })));
    }

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
  } catch (error) {
    console.error('[Notifications] ❌ Error fetching notifications:', error);
    throw error;
  }
});

/**
 * Get unread notification count
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    console.log('[Notifications] ❌ No authenticated user for unread count');
    return res.status(401).json({ message: 'Authentication required' });
  }

  console.log('[Notifications] 🔍 Getting unread count for user:', userId.toString());

  try {
    const count = await Notification.countDocuments({ userId, read: false });
    
    console.log(`[Notifications] ✅ Unread count: ${count}`);
    
    // Additional debugging: Get sample unread notifications
    if (count > 0) {
      const sampleUnread = await Notification.find({ userId, read: false })
        .select('_id title createdAt')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
      
      console.log('[Notifications] 📋 Sample unread notifications:', sampleUnread.map(n => ({
        id: n._id.toString(),
        title: n.title,
        createdAt: n.createdAt
      })));
    }

    res.json({ success: true, count });
  } catch (error) {
    console.error('[Notifications] ❌ Error getting unread count:', error);
    throw error;
  }
});

/**
 * Mark notification as read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  console.log('[Notifications] Marking as read:', id, 'for user:', userId.toString());

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
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  console.log('[Notifications] Marking all as read for user:', userId.toString());

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
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  console.log('[Notifications] Deleting notification:', id, 'for user:', userId.toString());

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
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  console.log('[Notifications] Deleting all read notifications for user:', userId.toString());

  const result = await Notification.deleteMany({ userId, read: true });

  res.json({ 
    success: true, 
    message: `Deleted ${result.deletedCount} read notifications` 
  });
});

