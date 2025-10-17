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

  const doc = await FcmToken.findOneAndUpdate(
    { userId, token },
    { platform: platform || 'web', userAgent, lastSeenAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ message: 'token saved', data: doc });
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
  console.log("entered")
  ensureAdminInitialized();

  const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

  // Resolve tokens
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

  const messaging = admin.messaging();

  // Helper: send single data message and cleanup invalid tokens
  async function sendDataMessage(singleToken, payload) {
    try {
      return await messaging.send({ token: singleToken, data: payload.data });
    } catch (err) {
      if (err.code === 'messaging/registration-token-not-registered') {
        try {
          await FcmToken.deleteOne({ token: singleToken });
          // eslint-disable-next-line no-console
          console.log(`FCM: Removed invalid token ${singleToken}`);
        } catch (_) {}
        return null;
      }
      throw err;
    }
  }

  // Build payload factory with merged user/device tag
  const payloadFor = (tkn) => ({
    data: {
      title: String(title),
      body: String(body),
      tag: userId ? `user_${userId}_notification` : `device_${tkn}_notification`,
    },
  });

  const responses = [];
  for (const t of tokens) {
    try {
      const resp = await sendDataMessage(t, payloadFor(t));
      if (resp) responses.push(resp);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`FCM admin send error for token ${t}:`, err.message || err);
    }
  }

  return res.json({ success: true, tokensSent: responses.length, responses });
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


