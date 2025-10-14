// controllers/sendDocument.controller.js
const nodemailer = require("nodemailer");
const axios = require("axios");
const User = require("../models/User"); // adjust path
const Document = require("../models/RulesDocument.model");
const { cloudinary } = require("../utils/cloudinary.utils"); // optional if you need cloudinary for deletion etc.

// Configure transporter via env
// Make sure .env contains SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true, // recommended for bulk sending
  maxConnections: Number(process.env.SMTP_MAX_CONN) || 5,
  maxMessages: Number(process.env.SMTP_MAX_MESSAGES) || 100,
});

// chunk helper
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * POST /docs/send
 * body:
 * {
 *   docId: "<mongo id>" or "all"  // optionally send a link if you want to send multiple docs, adapt
 *   recipients: "all" or ["a@a.com", "b@b.com"]
 *   subject: "Subject here"
 *   text: "Plain text body"
 *   html: "<p>HTML body</p>" // optional
 * }
 */
const sendDocument = async (req, res) => {
  try {
    const { docId, recipients, subject, text, html } = req.body;
    if (!subject || (!text && !html)) {
      return res.status(400).json({ error: "subject and text/html required" });
    }

    // Determine recipient emails
    let emails = [];
    if (!recipients) return res.status(400).json({ error: "recipients required (array or 'all')" });

    if (recipients === "all") {
      // fetch all user emails
      const users = await User.find({}, { email: 1, _id: 0 });
      emails = users.map((u) => u.email).filter(Boolean);
    } else if (Array.isArray(recipients)) {
      emails = recipients.filter(Boolean);
    } else {
      return res.status(400).json({ error: "recipients must be 'all' or array of emails" });
    }

    if (emails.length === 0) return res.status(400).json({ error: "no recipient emails found" });

    // Determine document to attach
    let docsToSend = [];
    if (!docId) {
      return res.status(400).json({ error: "docId required" });
    }

    if (docId === "all") {
      docsToSend = await Document.find().sort({ createdAt: -1 });
      if (!docsToSend.length) return res.status(400).json({ error: "no documents to send" });
    } else {
      const doc = await Document.findById(docId);
      if (!doc) return res.status(404).json({ error: "document not found" });
      docsToSend = [doc];
    }

    // Fetch each doc from Cloudinary (we'll attach one or more files)
    // For simplicity attach only the first doc if multiple cause large email size; you can extend to attach multiple.
    const firstDoc = docsToSend[0];
    if (!firstDoc.cloudinaryUrl) return res.status(400).json({ error: "document has no cloudinaryUrl" });

    // Download file into buffer
    const fileResp = await axios.get(firstDoc.cloudinaryUrl, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(fileResp.data, "binary");
    const attachment = {
      filename: firstDoc.filename || "document.pdf",
      content: fileBuffer,
      contentType: "application/pdf",
    };

    // Batch sending: tune via env
    const BATCH_SIZE = Number(process.env.MAIL_BATCH_SIZE) || 25;
    const PAUSE_MS = Number(process.env.MAIL_PAUSE_MS) || 1000;

    const batches = chunkArray(emails, BATCH_SIZE);
    let sent = 0, failed = 0;
    const errors = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // create promises for this batch
      const promises = batch.map((toEmail) => {
        const mailOptions = {
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: toEmail,
          subject,
          text,
          html,
          attachments: [attachment],
          headers: {
            "List-Unsubscribe": `<mailto:${process.env.MAIL_FROM}?subject=unsubscribe>`,
          },
        };
        return transporter.sendMail(mailOptions)
          .then(info => ({ ok: true, info, to: toEmail }))
          .catch(err => ({ ok: false, err, to: toEmail }));
      });

      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r.ok) sent++;
        else {
          failed++;
          errors.push({ to: r.to, message: r.err.message || String(r.err) });
        }
      });

      // pause between batches if required
      if (i < batches.length - 1 && PAUSE_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
      }
    }

    return res.json({ ok: true, total: emails.length, sent, failed, errors: errors.slice(0, 20) });

  } catch (err) {
    console.error("sendDocument error:", err);
    return res.status(500).json({ error: "Failed to send document", detail: err.message || err });
  }
};

module.exports = { sendDocument };
