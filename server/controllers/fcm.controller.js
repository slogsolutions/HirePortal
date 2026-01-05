const asyncHandler = require('express-async-handler');
const admin = require('firebase-admin');
const { ensureFirebaseAdmin } = require('../config/firebaseAdmin');
const FcmToken = require('../models/FcmToken.model');

// Initialize firebase-admin once
function ensureAdminInitialized() {
  ensureFirebaseAdmin();
}

exports.upsertToken = asyncHandler(async (req, res) => {
  // Accept userId from either req.user (if authenticated) or req.body
  const userId = req.user?.id || req.user?._id || req.body.userId;
  const { token, platform } = req.body;
  
  if (!userId || !token) {
    return res.status(400).json({ 
      message: 'userId and token are required',
      hint: userId ? 'Token is missing' : 'User ID is missing. Make sure you are authenticated or provide userId in request body.'
    });
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
  console.log(userId);
  const { title, body, data } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const tokens = await FcmToken.find({ userId }).select('token -_id');
  if (!tokens.length) return res.status(404).json({ message: 'No tokens for user' });

  // Build message without icon in notification (icon goes in webpush.notification)
  const message = {
    notification: title || body ? { 
      title: String(title || 'Notification'), 
      body: String(body || '') 
    } : undefined,
    data: data || {},
    tokens: tokens.map(t => t.token),
    android: {
      priority: 'high',
    },
    webpush: {
      notification: {
        title: String(title || 'Notification'),
        body: String(body || ''),
        icon: '/slog-logo.png', // Icon is valid in webpush.notification
      },
    },
  };

  const response = await admin.messaging().sendMulticast(message);

  res.json({ successCount: response.successCount, failureCount: response.failureCount, responses: response.responses });
});


// Admin: send data-only messages to various targets
exports.adminSend = asyncHandler(async (req, res) => {
  ensureAdminInitialized();

  const { title, body, userId, userIds, candidateId, candidateIds, deviceToken, allUsers, email } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

  const Candidate = require('../models/Candidate.model');
  const User = require('../models/User.model');

  // Resolve tokens
  let tokens = [];
  let resolvedUserIds = [];
  let skippedUsers = [];

  async function getTokensByUserId(id) {
    const docs = await FcmToken.find({ userId: id }).select('token -_id');
    return docs.map(d => d.token);
  }

  // Helper to resolve candidate IDs to user IDs
  async function resolveCandidateIdsToUserIds(candidateIds) {
    const candidates = await Candidate.find({ _id: { $in: candidateIds } }).select('_id userId email firstName lastName').lean();
    const userIdsFromCandidates = [];
    const candidateToUserMap = {};
    
    for (const candidate of candidates) {
      if (candidate.userId) {
        userIdsFromCandidates.push(candidate.userId);
        candidateToUserMap[candidate._id.toString()] = {
          userId: candidate.userId.toString(),
          candidateId: candidate._id.toString(),
          email: candidate.email,
          name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
        };
      } else {
        skippedUsers.push({
          candidateId: candidate._id.toString(),
          email: candidate.email,
          name: `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim(),
          reason: 'No linked user'
        });
      }
    }
    
    return { userIds: userIdsFromCandidates, map: candidateToUserMap };
  }

  // Helper to resolve email to user ID
  async function resolveEmailToUserId(email) {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('_id email name').lean();
    if (!user) {
      return { userId: null, error: 'User not found with this email' };
    }
    return { userId: user._id.toString(), email: user.email, name: user.name };
  }

  if (allUsers) {
    const docs = await FcmToken.find({}).select('userId token -_id');
    tokens = docs.map(d => d.token);
    // Get unique user IDs for all users
    const uniqueUserIds = [...new Set(docs.map(d => d.userId.toString()))];
    resolvedUserIds = uniqueUserIds;
    console.log(`[FCM] 📤 Sending to all users: ${tokens.length} tokens for ${uniqueUserIds.length} users`);
  } else if (deviceToken) {
    tokens = [deviceToken];
    // Can't determine userId from deviceToken alone
    resolvedUserIds = [];
    console.log(`[FCM] 📤 Sending to device token: ${deviceToken.substring(0, 20)}...`);
  } else if (email) {
    // Resolve email to userId
    const emailResult = await resolveEmailToUserId(email);
    if (!emailResult.userId) {
      return res.status(404).json({ 
        message: emailResult.error || `No user found with email: ${email}`,
        hint: 'Make sure the email exists in the User collection'
      });
    }
    tokens = await getTokensByUserId(emailResult.userId);
    resolvedUserIds = [emailResult.userId];
    console.log(`[FCM] 📤 Sending to user by email ${email}: userId=${emailResult.userId}, ${tokens.length} token(s) found`);
    if (tokens.length === 0) {
      return res.status(404).json({ 
        message: `No tokens found for user with email ${email}`,
        hint: 'User exists but has no FCM tokens saved. Make sure the user has saved their FCM token.'
      });
    }
  } else if (candidateId) {
    // Resolve single candidate ID to userId
    const candidate = await Candidate.findById(candidateId).select('_id userId email firstName lastName').lean();
    if (!candidate) {
      return res.status(404).json({ message: `Candidate not found: ${candidateId}` });
    }
    if (!candidate.userId) {
      return res.status(404).json({ 
        message: `Candidate ${candidateId} has no linked user`,
        hint: 'This candidate needs to be linked to a User account first'
      });
    }
    tokens = await getTokensByUserId(candidate.userId);
    resolvedUserIds = [candidate.userId.toString()];
    console.log(`[FCM] 📤 Sending to candidate ${candidateId} (userId: ${candidate.userId}): ${tokens.length} token(s) found`);
    if (tokens.length === 0) {
      return res.status(404).json({ 
        message: `No tokens found for candidate ${candidateId}`,
        hint: 'Candidate has a linked user, but the user has no FCM tokens saved.'
      });
    }
  } else if (Array.isArray(candidateIds) && candidateIds.length > 0) {
    // Resolve multiple candidate IDs to userIds
    const { userIds: resolvedIds, map: candidateMap } = await resolveCandidateIdsToUserIds(candidateIds);
    console.log(`[FCM] 📤 Resolved ${candidateIds.length} candidates to ${resolvedIds.length} users`);
    
    if (resolvedIds.length === 0) {
      return res.status(404).json({ 
        message: 'No users found for the selected candidates',
        skipped: skippedUsers
      });
    }

    const docs = await FcmToken.find({ userId: { $in: resolvedIds } }).select('userId token -_id');
    tokens = docs.map(d => d.token);
    const usersWithTokens = [...new Set(docs.map(d => d.userId.toString()))];
    resolvedUserIds = usersWithTokens;
    
    // Find which candidates/users don't have tokens
    const usersWithoutTokens = resolvedIds.filter(id => !usersWithTokens.includes(id.toString()));
    for (const userId of usersWithoutTokens) {
      const candidateEntry = Object.values(candidateMap).find(entry => entry.userId === userId.toString());
      if (candidateEntry) {
        skippedUsers.push({
          ...candidateEntry,
          reason: 'No FCM token saved'
        });
      }
    }
    
    console.log(`[FCM] 📤 Sending to ${candidateIds.length} candidates: ${tokens.length} token(s) for ${usersWithTokens.length} users`);
    if (tokens.length === 0) {
      return res.status(404).json({ 
        message: 'No tokens found for selected candidates',
        skipped: skippedUsers,
        hint: 'Selected candidates have linked users, but those users have no FCM tokens saved.'
      });
    }
  } else if (userId) {
    tokens = await getTokensByUserId(userId);
    resolvedUserIds = [userId];
    console.log(`[FCM] 📤 Sending to user ${userId}: ${tokens.length} token(s) found`);
    if (tokens.length === 0) {
      return res.status(404).json({ 
        message: `No tokens found for user ${userId}`,
        hint: 'Make sure the user has saved their FCM token by using the app or clicking "Save FCM Token" button'
      });
    }
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    const docs = await FcmToken.find({ userId: { $in: userIds } }).select('userId token -_id');
    tokens = docs.map(d => d.token);
    const usersWithTokens = [...new Set(docs.map(d => d.userId.toString()))];
    resolvedUserIds = usersWithTokens;
    
    // Check which users don't have tokens
    const usersWithoutTokens = userIds.filter(id => !usersWithTokens.includes(id.toString()));
    if (usersWithoutTokens.length > 0) {
      console.warn(`[FCM] ⚠️ Users without tokens: ${usersWithoutTokens.join(', ')}`);
      skippedUsers = usersWithoutTokens.map(id => ({ userId: id.toString(), reason: 'No FCM token saved' }));
    }
    
    console.log(`[FCM] 📤 Sending to ${userIds.length} users: ${tokens.length} token(s) found`);
    if (tokens.length === 0) {
      return res.status(404).json({ 
        message: 'No tokens found for selected users',
        skipped: skippedUsers,
        hint: 'Selected users have no FCM tokens saved.'
      });
    }
  } else {
    return res.status(400).json({ 
      message: 'No target specified',
      hint: 'Provide one of: userId, userIds (array), candidateId, candidateIds (array), email, deviceToken, or allUsers: true'
    });
  }

  if (!tokens.length) {
    return res.status(404).json({ 
      message: 'No tokens found for target',
      hint: 'Make sure users have saved their FCM tokens. Tokens are saved automatically when users use the app, or they can manually save via the "Save FCM Token" button.'
    });
  }

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

    // Return both notification (for foreground) and data (for background)
    // Note: icon is NOT valid in notification object, it goes in webpush.notification.icon
    return {
      notification: {
        title: String(title),
        body: String(body),
        // Do NOT include icon here - it's not valid in FCM notification object
        // Icon will be set in webpush.notification.icon in the service
      },
      data: {
        title: String(title),
        body: String(body),
        tag: tag,
        timestamp: new Date().toISOString(),
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For web compatibility
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

  // Count successful sends
  const successCount = responses.filter(r => r.success).length;
  const failureCount = responses.length - successCount;

  console.log(`[FCM] ✅ Notification send completed: ${successCount} successful, ${failureCount} failed out of ${tokens.length} tokens`);

  return res.json({ 
    success: true, 
    tokensSent: successCount,
    totalTokens: tokens.length,
    successCount,
    failureCount,
    skipped: skippedUsers.length > 0 ? skippedUsers : undefined,
    responses: responses.slice(0, 10) // Limit response size, return first 10
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

// Get list of users with their FCM tokens (for admin panel)
exports.getUsersWithTokens = asyncHandler(async (req, res) => {
  const User = require('../models/User.model');
  
  try {
    // Get all tokens with user info
    const tokens = await FcmToken.find({})
      .populate('userId', 'name email role')
      .select('userId token platform lastSeenAt createdAt')
      .sort({ lastSeenAt: -1 })
      .lean();

    // Group by userId
    const userMap = new Map();
    
    tokens.forEach(tokenDoc => {
      const userId = tokenDoc.userId?._id?.toString() || tokenDoc.userId?.toString();
      if (!userId) return;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: userId,
          user: tokenDoc.userId,
          tokens: [],
          tokenCount: 0
        });
      }
      
      const userData = userMap.get(userId);
      userData.tokens.push({
        token: tokenDoc.token.substring(0, 20) + '...', // Partial token for display
        fullToken: tokenDoc.token, // Full token for sending
        platform: tokenDoc.platform,
        lastSeenAt: tokenDoc.lastSeenAt,
        createdAt: tokenDoc.createdAt
      });
      userData.tokenCount = userData.tokens.length;
    });

    const usersWithTokens = Array.from(userMap.values());

    res.json({
      success: true,
      totalUsers: usersWithTokens.length,
      totalTokens: tokens.length,
      data: usersWithTokens
    });
  } catch (error) {
    console.error('[FCM] ❌ Error fetching users with tokens:', error);
    throw error;
  }
});


