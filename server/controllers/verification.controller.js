// controllers/verification.controller.js
const Candidate = require("../models/Candidate.model");
const { generateNumericOtp, hashOtp } = require("../utils/otp.utils");
const { sendSms } = require("../utils/sms.utils");
const { sendEmail } = require("../utils/email.utils");

const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const OTP_RATE_LIMIT_WINDOW = Number(process.env.OTP_RATE_LIMIT_WINDOW) || 60;

function nowPlusSeconds(s) { return new Date(Date.now() + s * 1000); }

async function sendOtp(req, res) {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'mobile' or 'email'
    if (!["mobile", "email"].includes(type)) {
      return res.status(400).json({ message: "type must be 'mobile' or 'email'" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // pick contact
    const contact = type === "mobile" ? candidate.mobile : candidate.email;
    if (!contact) return res.status(400).json({ message: `${type} not present for candidate` });

    // choose otp subdocument
    const otpField = type === "mobile" ? "mobileOtp" : "emailOtp";
    const current = candidate[otpField] || {};

    // rate-limit: not sending more than once per window
    if (current.lastSentAt && (Date.now() - new Date(current.lastSentAt).getTime()) < OTP_RATE_LIMIT_WINDOW * 1000) {
      return res.status(429).json({ message: `OTP recently sent. Try again later.` });
    }

    // generate OTP and hash
    const otp = generateNumericOtp(OTP_LENGTH);
    const otpHash = hashOtp(otp);
    const expiresAt = nowPlusSeconds(OTP_TTL_SECONDS);

    // store hash & meta
    candidate[otpField] = {
      hash: otpHash,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date()
    };
    await candidate.save();

    // send via SMS or email
    if (type === "mobile") {
      // ideally format the number correctly; your Twilio setup must match country codes
      const smsBody = `Your verification code is: ${otp}. It expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
      await sendSms(contact, smsBody);
    } else {
      const subject = "Your verification code";
      const text = `Your verification code is: ${otp}. It expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
      const html = `<p>Your verification code is: <strong>${otp}</strong></p><p>Expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.</p>`;
      await sendEmail(contact, subject, text, html);
    }

    return res.json({ ok: true, message: "OTP sent" });
  } catch (err) {
    console.error("sendOtp error", err);
    return res.status(500).json({ message: "Failed to send OTP", detail: err.message });
  }
}

async function confirmOtp(req, res) {
  try {
    const { id } = req.params;
    const { type, otp } = req.body;
    if (!otp || !["mobile", "email"].includes(type)) {
      return res.status(400).json({ message: "type and otp required" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const otpField = type === "mobile" ? "mobileOtp" : "emailOtp";
    const otpDoc = candidate[otpField];
    if (!otpDoc || !otpDoc.hash || !otpDoc.expiresAt) {
      return res.status(400).json({ message: "No OTP requested for this contact" });
    }

    // check expiry
    if (new Date() > new Date(otpDoc.expiresAt)) {
      // clear OTP to force re-request
      candidate[otpField] = undefined;
      await candidate.save();
      return res.status(400).json({ message: "OTP expired — request a new one" });
    }

    // check attempt count
    if ((otpDoc.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      candidate[otpField] = undefined;
      await candidate.save();
      return res.status(429).json({ message: "Too many attempts — request a new OTP" });
    }

    // verify
    const { hashOtp } = require("../utils/otp.utils"); // local function
    const providedHash = hashOtp(String(otp).trim());
    if (providedHash !== otpDoc.hash) {
      // increment attempts
      candidate[otpField].attempts = (candidate[otpField].attempts || 0) + 1;
      await candidate.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // success → mark verified, clear OTP doc
    if (type === "mobile") candidate.mobileVerified = true;
    else candidate.emailVerified = true;

    candidate[otpField] = undefined;
    await candidate.save();

    return res.json({ ok: true, message: `${type} verified` });
  } catch (err) {
    console.error("confirmOtp error", err);
    return res.status(500).json({ message: "Failed to confirm OTP", detail: err.message });
  }
}

module.exports = { sendOtp, confirmOtp };
