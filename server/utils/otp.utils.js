// utils/otp.utils.js
const crypto = require("crypto");

function generateNumericOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function hashOtp(otp) {
  // HMAC with a server secret (or use bcrypt)
  const hmac = crypto.createHmac("sha256", process.env.OTP_HASH_SECRET || "otp-secret");
  hmac.update(otp);
  return hmac.digest("hex");
}

module.exports = { generateNumericOtp, hashOtp };
