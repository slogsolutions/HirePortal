// routes/verification.routes.js
const express = require("express");
const router = express.Router();
const { sendOtp, confirmOtp } = require("../controllers/verification.controller");
const { protect } = require("../middlewares/auth.middleware"); // if you want to require auth

// optionally protect routes — e.g., only HR or interviewer can trigger
router.post("/:id/verify/send-otp", protect, sendOtp);
router.post("/:id/verify/confirm-otp", protect, confirmOtp);

module.exports = router;
