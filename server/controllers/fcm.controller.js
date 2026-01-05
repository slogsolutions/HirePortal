const asyncHandler = require('express-async-handler');
const admin = require('firebase-admin');
const { ensureFirebaseAdmin } = require('../config/firebaseAdmin');
const FcmToken = require('../models/FcmToken.model');

// Initialize firebase-admin once
function ensureAdminInitialized() {
  ensureFirebaseAdmin();
}

exports.upsertToken = asyncHandler(async (req, res) => {
  const { userId, token, platform } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ message: 'userId and token are required' });
  }

  const userAgent = req.headers['user-agent'];
  const platformValue = platform || 'web';

  try {
    // Check if this exact token already exists for this user
    const existingToken = await FcmToken.findOne({ userId, token });
    
    if (existingToken) {
      // Token already exists, just update metadata
      existingToken.lastSeenAt = new Date();
      existingToken.userAgent = userAgent;
      existingToken.platform = platformValue;
      await existingToken.save();
      console.log(`[FCM] ✅ Token updated for user ${userId}`);
      return res.json({ message: 'token updated', data: existingToken });
    }

    // This is a new token - check if user has other tokens
    const userTokens = await FcmToken.find({ userId });
    
    // Save the new token (multi-device support - keep old tokens)
    // Invalid tokens will be cleaned up automatically when we try to send notifications
    const doc = await FcmToken.create({
      userId,
      token,
      platform: platformValue,
      userAgent,
      lastSeenAt: new Date()
    });

    console.log(`[FCM] ✅ New token saved for user ${userId} (total tokens: ${userTokens.length + 1})`);

    res.json({ message: 'token saved', data: doc });
  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      const existing = await FcmToken.findOne({ userId, token });
      if (existing) {
        existing.lastSeenAt = new Date();
        existing.userAgent = userAgent;
        existing.platform = platformValue;
        await existing.save();
        console.log(`[FCM] ✅ Token updated (race condition handled) for user ${userId}`);
        return res.json({ message: 'token updated', data: existing });
      }
    }
    console.error(`[FCM] ❌ Error saving token for user ${userId}:`, error);
    throw error;
  }
});

exports.sendToUser = asyncHandler(async (req, res) => {
  ensureAdminInitialized();
  const { userId } = req.params;
  const { title, body, data } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const tokens = await FcmToken.find({ userId }).select('token -_id');
  if (!tokens.length) return res.status(404).json({ message: 'No tokens for user' });

  const message = {
    notification: title || body ? { title: title || 'Notification', body: body || '' } : undefined,
    data: data || {},
    tokens: tokens.map(t => t.token)
  };

  const response = await admin.messaging().sendMulticast(message);

  res.json({ successCount: response.successCount, failureCount: response.failureCount, responses: response.responses });
});


// Admin: send data-only messages to various targets
exports.adminSend = asyncHandler(async (req, res) => {
  ensureAdminInitialized();

  const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

  // Resolve tokens
  let tokens = [];
  let resolvedUserIds = [];

  async function getTokensByUserId(id) {
    const docs = await FcmToken.find({ userId: id }).select('token -_id');
    return docs.map(d => d.token);
  }

  if (allUsers) {
    const docs = await FcmToken.find({}).select('userId token -_id');
    tokens = docs.map(d => d.token);
    // Get unique user IDs for all users
    const uniqueUserIds = [...new Set(docs.map(d => d.userId.toString()))];
    resolvedUserIds = uniqueUserIds;
  } else if (deviceToken) {
    tokens = [deviceToken];
    // Can't determine userId from deviceToken alone
    resolvedUserIds = [];
  } else if (userId) {
    tokens = await getTokensByUserId(userId);
    resolvedUserIds = [userId];
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    const docs = await FcmToken.find({ userId: { $in: userIds } }).select('token -_id');
    tokens = docs.map(d => d.token);
    resolvedUserIds = userIds;
  } else {
    return res.status(400).json({ message: 'No target specified' });
  }

  if (!tokens.length) return res.status(404).json({ message: 'No tokens found for target' });

  // Use NotificationService for better token cleanup
  const NotificationService = require('../utils/notification.service');

  // Get sender ID from request (if authenticated)
  const sentBy = req.user?.id || null;

  // Build payload factory with proper tag
  const payloadFor = (tkn) => {
    // Determine tag based on target type
    let tag;
    if (userId) {
      tag = `user_${userId}_notification`;
    } else if (resolvedUserIds.length > 0) {
      // For multiple users, use a generic tag
      tag = `users_notification`;
    } else {
      tag = `device_${tkn.substring(0, 10)}_notification`;
    }

    return {
      data: {
        title: String(title),
        body: String(body),
        tag: tag,
      },
    };
  };

  // Use NotificationService for batch sending, automatic cleanup, and DB storage
  const responses = await NotificationService.sendDataMessageMultiple(
    tokens, 
    payloadFor, 
    resolvedUserIds.length > 0 ? resolvedUserIds : null,
    sentBy
  );

  return res.json({ 
    success: true, 
    tokensSent: responses.length, 
    totalTokens: tokens.length,
    responses 
  });
});

// Very simple admin route: resolve tokens and send data-only messages
exports.adminSimple = asyncHandler(async (req, res) => {
  ensureAdminInitialized();
  const NotificationService = require('../utils/notification.service');

  const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

  let tokens = [];

  async function getTokensByUserId(id) {
    const docs = await FcmToken.find({ userId: id }).select('token -_id');
    return docs.map(d => d.token);
  }

  if (allUsers) {
    const docs = await FcmToken.find({}).select('token -_id');
    tokens = docs.map(d => d.token);
  } else if (deviceToken) {
    tokens = [deviceToken];
  } else if (userId) {
    tokens = await getTokensByUserId(userId);
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    const docs = await FcmToken.find({ userId: { $in: userIds } }).select('token -_id');
    tokens = docs.map(d => d.token);
  } else {
    return res.status(400).json({ message: 'No target specified' });
  }

  if (!tokens.length) return res.status(404).json({ message: 'No tokens found for target' });

  const responses = await NotificationService.sendDataMessageMultiple(tokens, (tkn) => ({
    data: {
      title: String(title),
      body: String(body),
      tag: userId ? `user_${userId}_notification` : `device_${tkn}_notification`,
    },
  }));

  return res.json({ success: true, tokensSent: responses.length, responses });
});


