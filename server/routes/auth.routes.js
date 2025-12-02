const express = require('express');
const { sendOtp, verifyOtp, login } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/otp/send', sendOtp);
router.post('/otp/verify', verifyOtp);
router.post('/login', login);

module.exports = router;
