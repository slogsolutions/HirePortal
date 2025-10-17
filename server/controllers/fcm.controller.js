const asyncHandler = require('express-async-handler');
const admin = require('firebase-admin');
const FcmToken = require('../models/FcmToken.model');

// Initialize firebase-admin once
let adminInitialized = false;
function ensureAdminInitialized() {
  if (adminInitialized) return;
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env json not configured');
  }
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  adminInitialized = true;
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


