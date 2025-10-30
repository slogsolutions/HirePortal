// // // controllers/verification.controller.js
// // const Candidate = require("../models/Candidate.model");
// // const { generateNumericOtp, hashOtp } = require("../utils/otp.utils");
// // const { sendSms } = require("../utils/sms.utils");
// // const { sendEmail } = require("../utils/email.utils");

// // const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
// // const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;
// // const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
// // const OTP_RATE_LIMIT_WINDOW = Number(process.env.OTP_RATE_LIMIT_WINDOW) || 60;

// // function nowPlusSeconds(s) { return new Date(Date.now() + s * 1000); }

// // async function sendOtp(req, res) {
// //   try {
// //     const { id } = req.params;
// //     const { type } = req.body; // 'mobile' or 'email'
// //     if (!["mobile", "email"].includes(type)) {
// //       return res.status(400).json({ message: "type must be 'mobile' or 'email'" });
// //     }

// //     const candidate = await Candidate.findById(id);
// //     if (!candidate) return res.status(404).json({ message: "Candidate not found" });

// //     // pick contact
// //     const contact = type === "mobile" ? candidate.mobile : candidate.email;
// //     if (!contact) return res.status(400).json({ message: `${type} not present for candidate` });

// //     // choose otp subdocument
// //     const otpField = type === "mobile" ? "mobileOtp" : "emailOtp";
// //     const current = candidate[otpField] || {};

// //     // rate-limit: not sending more than once per window
// //     if (current.lastSentAt && (Date.now() - new Date(current.lastSentAt).getTime()) < OTP_RATE_LIMIT_WINDOW * 1000) {
// //       return res.status(429).json({ message: `OTP recently sent. Try again later.` });
// //     }

// //     // generate OTP and hash
// //     const otp = generateNumericOtp(OTP_LENGTH);
// //     const otpHash = hashOtp(otp);
// //     const expiresAt = nowPlusSeconds(OTP_TTL_SECONDS);

// //     // store hash & meta
// //     candidate[otpField] = {
// //       hash: otpHash,
// //       expiresAt,
// //       attempts: 0,
// //       lastSentAt: new Date()
// //     };
// //     await candidate.save();

// //     // send via SMS or email
// //     if (type === "mobile") {
// //       // ideally format the number correctly; your Twilio setup must match country codes
// //       const smsBody = `Your verification code is: ${otp}. It expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
// //       await sendSms(contact, smsBody);
// //     } else {
// //       const subject = "Your verification code";
// //       const text = `Your verification code is: ${otp}. It expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
// //       const html = `<p>Your verification code is: <strong>${otp}</strong></p><p>Expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.</p>`;
// //       await sendEmail(contact, subject, text, html);
// //     }

// //     return res.json({ ok: true, message: "OTP sent" });
// //   } catch (err) {
// //     console.error("sendOtp error", err);
// //     return res.status(500).json({ message: "Failed to send OTP", detail: err.message });
// //   }
// // }

// // async function confirmOtp(req, res) {
// //   try {
// //     const { id } = req.params;
// //     const { type, otp } = req.body;
// //     if (!otp || !["mobile", "email"].includes(type)) {
// //       return res.status(400).json({ message: "type and otp required" });
// //     }

// //     const candidate = await Candidate.findById(id);
// //     if (!candidate) return res.status(404).json({ message: "Candidate not found" });

// //     const otpField = type === "mobile" ? "mobileOtp" : "emailOtp";
// //     const otpDoc = candidate[otpField];
// //     if (!otpDoc || !otpDoc.hash || !otpDoc.expiresAt) {
// //       return res.status(400).json({ message: "No OTP requested for this contact" });
// //     }

// //     // check expiry
// //     if (new Date() > new Date(otpDoc.expiresAt)) {
// //       // clear OTP to force re-request
// //       candidate[otpField] = undefined;
// //       await candidate.save();
// //       return res.status(400).json({ message: "OTP expired — request a new one" });
// //     }

// //     // check attempt count
// //     if ((otpDoc.attempts || 0) >= OTP_MAX_ATTEMPTS) {
// //       candidate[otpField] = undefined;
// //       await candidate.save();
// //       return res.status(429).json({ message: "Too many attempts — request a new OTP" });
// //     }

// //     // verify
// //     const { hashOtp } = require("../utils/otp.utils"); // local function
// //     const providedHash = hashOtp(String(otp).trim());
// //     if (providedHash !== otpDoc.hash) {
// //       // increment attempts
// //       candidate[otpField].attempts = (candidate[otpField].attempts || 0) + 1;
// //       await candidate.save();
// //       return res.status(400).json({ message: "Invalid OTP" });
// //     }

// //     // success → mark verified, clear OTP doc
// //     if (type === "mobile") candidate.mobileVerified = true;
// //     else candidate.emailVerified = true;

// //     candidate[otpField] = undefined;
// //     await candidate.save();

// //     return res.json({ ok: true, message: `${type} verified` });
// //   } catch (err) {
// //     console.error("confirmOtp error", err);
// //     return res.status(500).json({ message: "Failed to confirm OTP", detail: err.message });
// //   }
// // }

// // module.exports = { sendOtp, confirmOtp };
// // controllers/verification.controller.js
// const Candidate = require("../models/Candidate.model");
// const { generateNumericOtp, hashOtp } = require("../utils/otp.utils");
// const { sendSms } = require("../utils/sms.utils");
// const { sendEmail } = require("../utils/email.utils");

// const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
// const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS) || 300;
// const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
// const OTP_RATE_LIMIT_WINDOW = Number(process.env.OTP_RATE_LIMIT_WINDOW) || 60;

// function nowPlusSeconds(s) { return new Date(Date.now() + s * 1000); }

// /**
//  * Resolve a "type" string (requested by client) to:
//  * - contact: the email/phone to send to
//  * - otpField: where to store the OTP meta on the candidate doc
//  * - verifiedField: which boolean to mark true on success
//  * - role: 'candidate' or 'father' (for messages / logging)
//  *
//  * This function is defensive: it checks for fields existence and returns null
//  * if no suitable contact for the requested type.
//  */
// function resolveType(candidate, type) {
//   switch (type) {
//     // Candidate
//     case 'mobile':
//       return { contact: candidate.mobile, otpField: 'mobileOtp', verifiedField: 'mobileVerified', role: 'candidate' };
//     case 'email':
//       return { contact: candidate.email, otpField: 'emailOtp', verifiedField: 'emailVerified', role: 'candidate' };
//     case 'aadhaar':
//       // prefer candidate.email, fallback to candidate.mobile
//       return { contact: candidate.email || candidate.mobile, otpField: 'aadhaarOtp', verifiedField: 'aadhaarVerified', role: 'candidate' };

//     // Father (use father's fields if present)
//     case 'fatherMobile':
//       return { contact: candidate.fatherMobile, otpField: 'fatherMobileOtp', verifiedField: 'fatherMobileVerified', role: 'father' };
//     case 'fatherEmail':
//       // candidate may or may not have fatherEmail; try that
//       return { contact: candidate.fatherEmail || null, otpField: 'fatherEmailOtp', verifiedField: 'fatherEmailVerified', role: 'father' };
//     case 'fatherAadhaar':
//       // prefer father's email, then father's mobile (if fatherAadhaar requires OTP to father)
//       return { contact: candidate.fatherEmail || candidate.fatherMobile || null, otpField: 'fatherAadhaarOtp', verifiedField: 'fatherAadhaarVerified', role: 'father' };

//     default:
//       return null;
//   }
// }

// async function sendOtp(req, res) {
//   try {
//     const { id } = req.params;
//     const { type } = req.body;
//     if (!type) return res.status(400).json({ message: "type required (e.g. 'mobile','email','aadhaar','fatherMobile','fatherEmail','fatherAadhaar')" });

//     const candidate = await Candidate.findById(id);
//     if (!candidate) return res.status(404).json({ message: "Candidate not found" });

//     const resolved = resolveType(candidate, type);
//     if (!resolved) return res.status(400).json({ message: "unsupported type" });

//     const { contact, otpField, role } = resolved;
//     if (!contact) {
//       return res.status(400).json({ message: `No contact available for type '${type}'.` });
//     }

//     // existing OTP metadata (may be undefined)
//     const current = candidate[otpField] || {};

//     // rate-limit: prevent frequent resends
//     if (current.lastSentAt && (Date.now() - new Date(current.lastSentAt).getTime()) < OTP_RATE_LIMIT_WINDOW * 1000) {
//       return res.status(429).json({ message: `OTP recently sent. Try again later.` });
//     }

//     // generate OTP and store hashed metadata
//     const otpPlain = generateNumericOtp(OTP_LENGTH);
//     const otpHash = hashOtp(otpPlain);
//     const expiresAt = nowPlusSeconds(OTP_TTL_SECONDS);

//     candidate[otpField] = {
//       hash: otpHash,
//       expiresAt,
//       attempts: 0,
//       lastSentAt: new Date()
//     };

//     await candidate.save();

//     // choose transport based on whether contact looks like email
//     const isEmail = String(contact).includes('@');

//     if (isEmail) {
//       const subject = role === 'father'
//         ? `Verification code for ${candidate.fatherName || 'father'}`
//         : `Verification code for ${candidate.firstName || 'candidate'}`;
//       const text = `Your verification code is: ${otpPlain}. It expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
//       const html = `<p>Your verification code is: <strong>${otpPlain}</strong></p><p>Expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.</p>`;
//       await sendEmail(contact, subject, text, html);
//     } else {
//       // phone number - send SMS (sendSms util should normalize to E.164)
//       const smsBody = `Your verification code is: ${otpPlain}. It expires in ${Math.floor(OTP_TTL_SECONDS / 60)} minutes.`;
//       await sendSms(contact, smsBody);
//     }

//     return res.json({ ok: true, message: "OTP sent" });
//   } catch (err) {
//     console.error("sendOtp error:", err);
//     return res.status(500).json({ message: "Failed to send OTP", detail: err.message });
//   }
// }

// async function confirmOtp(req, res) {
//   try {
//     const { id } = req.params;
//     const { type, otp } = req.body;
//     if (!type || !otp) return res.status(400).json({ message: "type and otp required" });

//     const candidate = await Candidate.findById(id);
//     if (!candidate) return res.status(404).json({ message: "Candidate not found" });

//     const resolved = resolveType(candidate, type);
//     if (!resolved) return res.status(400).json({ message: "unsupported type" });

//     const { otpField, verifiedField } = resolved;
//     const otpDoc = candidate[otpField];
//     if (!otpDoc || !otpDoc.hash || !otpDoc.expiresAt) {
//       return res.status(400).json({ message: "No OTP requested for this contact" });
//     }

//     // expiry check
//     if (new Date() > new Date(otpDoc.expiresAt)) {
//       candidate[otpField] = undefined;
//       await candidate.save();
//       return res.status(400).json({ message: "OTP expired — request a new one" });
//     }

//     // attempts check
//     if ((otpDoc.attempts || 0) >= OTP_MAX_ATTEMPTS) {
//       candidate[otpField] = undefined;
//       await candidate.save();
//       return res.status(429).json({ message: "Too many attempts — request a new OTP" });
//     }

//     const providedHash = hashOtp(String(otp).trim());
//     if (providedHash !== otpDoc.hash) {
//       // increment attempts
//       candidate[otpField].attempts = (candidate[otpField].attempts || 0) + 1;
//       await candidate.save();
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     // success — set corresponding verified flag
//     candidate[verifiedField] = true;
//     candidate[otpField] = undefined;
//     await candidate.save();

//     return res.json({ ok: true, message: `${type} verified` });
//   } catch (err) {
//     console.error("confirmOtp error:", err);
//     return res.status(500).json({ message: "Failed to confirm OTP", detail: err.message });
//   }
// }

// module.exports = { sendOtp, confirmOtp };
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
    const { type } = req.body; // 'mobile' or 'email' or 'fatherMobile'
    if (!["mobile", "email", "fatherMobile"].includes(type)) {
      return res.status(400).json({ message: "type must be 'mobile', 'email' or 'fatherMobile'" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // pick contact based on type
    let contact;
    if (type === "mobile") contact = candidate.mobile;
    else if (type === "email") contact = candidate.email;
    else if (type === "fatherMobile") contact = candidate.fatherMobile;

    if (!contact) return res.status(400).json({ message: `${type} not present for candidate` });

    // choose otp subdocument name
    const otpField = (type === "mobile") ? "mobileOtp" : (type === "email" ? "emailOtp" : "fatherMobileOtp");
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
    if (type === "mobile" || type === "fatherMobile") {
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
    if (!otp || !["mobile", "email", "fatherMobile"].includes(type)) {
      return res.status(400).json({ message: "type and otp required" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const otpField = (type === "mobile") ? "mobileOtp" : (type === "email" ? "emailOtp" : "fatherMobileOtp");
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
    const providedHash = hashOtp(String(otp).trim());
    if (providedHash !== otpDoc.hash) {
      // increment attempts
      candidate[otpField].attempts = (candidate[otpField].attempts || 0) + 1;
      await candidate.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // success → mark verified, clear OTP doc
    if (type === "mobile") candidate.mobileVerified = true;
    else if (type === "email") candidate.emailVerified = true;
    else if (type === "fatherMobile") candidate.fatherMobileVerified = true;

    candidate[otpField] = undefined;
    await candidate.save();

    return res.json({ ok: true, message: `${type} verified` });
  } catch (err) {
    console.error("confirmOtp error", err);
    return res.status(500).json({ message: "Failed to confirm OTP", detail: err.message });
  }
}

module.exports = { sendOtp, confirmOtp };
