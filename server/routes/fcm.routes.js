const express = require('express');
const router = express.Router();
const { upsertToken, sendToUser, adminSend, adminSimple } = require('../controllers/fcm.controller');

// Save or update token
router.post('/fcm/token', upsertToken);

// Send a test notification to user
router.post('/fcm/send/:userId', sendToUser);

// Admin send route (data-only payloads)
router.post('/fcm/admin/send', adminSend);
router.post('/fcm/admin/simple', adminSimple);

module.exports = router;


