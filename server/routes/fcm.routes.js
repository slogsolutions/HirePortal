const express = require('express');
const router = express.Router();
const { upsertToken, sendToUser } = require('../controllers/fcm.controller');

// Save or update token
router.post('/fcm/token', upsertToken);

// Send a test notification to user
router.post('/fcm/send/:userId', sendToUser);

module.exports = router;


