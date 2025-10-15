const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { getMyProfile, updatePassword } = require('../controllers/profile.controller');

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// GET /api/profile/me - Get current user's profile
router.get('/me', getMyProfile);

// PUT /api/profile/password - Update user's password
router.put('/password', updatePassword);

module.exports = router;
