// routes/verificationRoutes.js
const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const router = express.Router({ mergeParams: true });
const verification = require('../controllers/verification.controller');

// POST /candidates/:id/verify/send-otp
router.post('/:id/verify/send-otp', verification.sendOtp);

// POST /candidates/:id/verify/confirm-otp
router.post('/:id/verify/confirm-otp', verification.confirmOtp);

// POST /candidates/:id/verify/manual
router.post('/:id/verify/manual', verification.manualVerify);

module.exports = router;
