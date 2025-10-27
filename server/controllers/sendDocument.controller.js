const nodemailer = require("nodemailer");
const axios = require("axios");
const User = require("../models/User.model");
const Document = require("../models/Document.model");

// helper: split array into chunks
const chunkArray = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendDocument = async (req, res) => {
  try {
    const { docId, recipients, subject, text, html } = req.body;
    if (!subject || (!text && !html)) {
      return res.status(400).json({ error: "subject and text/html required" });
    }

    // Determine recipients
    let emails = [];
    if (!recipients) return res.status(400).json({ error: "recipients required (array or 'all')" });

    if (recipients === "all") {
      const users = await User.find({}, { email: 1, _id: 0 });
      emails = users.map((u) => u.email).filter(Boolean);
    } else if (Array.isArray(recipients)) {
      emails = recipients.filter(Boolean);
    } else {
      return res.status(400).json({ error: "recipients must be 'all' or array of emails" });
    }

    if (emails.length === 0) return res.status(400).json({ error: "no recipient emails found" });

    // Fetch document
    let docsToSend = [];
    if (docId === "all") {
      docsToSend = await Document.find().sort({ createdAt: -1 });
      if (!docsToSend.length) return res.status(400).json({ error: "no documents to send" });
    } else {
      const doc = await Document.findById(docId);
      if (!doc) return res.status(404).json({ error: "document not found" });
      docsToSend = [doc];
    }

    const firstDoc = docsToSend[0];
    if (!firstDoc.cloudinaryUrl) return res.status(400).json({ error: "document has no cloudinaryUrl" });

    // download file buffer
    const fileResp = await axios.get(firstDoc.cloudinaryUrl, { responseType: "arraybuffer" });
    const fileBuffer = Buffer.from(fileResp.data, "binary");

    const attachment = {
      filename: firstDoc.filename || "document.pdf",
      content: fileBuffer,
      contentType: "application/pdf",
    };

    const BATCH_SIZE = Number(process.env.MAIL_BATCH_SIZE) || 20;
    const PAUSE_MS = Number(process.env.MAIL_PAUSE_MS) || 1500;

    const batches = chunkArray(emails, BATCH_SIZE);
    let sent = 0, failed = 0;
    const errors = [];
    const logs = [];

    console.log(`📦 Starting document send: total=${emails.length}, batchSize=${BATCH_SIZE}`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n🚀 Sending batch ${i + 1}/${batches.length} (${batch.length} recipients)...`);
      logs.push(`Batch ${i + 1}/${batches.length} started: ${batch.length} recipients`);

      const results = await Promise.all(
        batch.map(async (toEmail) => {
          try {
            const mailOptions = {
              from: process.env.MAIL_FROM || process.env.SMTP_USER,
              to: toEmail,
              subject,
              text,
              html,
              attachments: [attachment],
              headers: { "List-Unsubscribe": `<mailto:${process.env.MAIL_FROM}?subject=unsubscribe>` },
            };
            const info = await transporter.sendMail(mailOptions);
            sent++;
            console.log(`✅ Delivered to: ${toEmail}`);
            return { ok: true, to: toEmail, info };
          } catch (err) {
            failed++;
            console.warn(`❌ Failed for ${toEmail}:`, err.message);
            errors.push({ to: toEmail, message: err.message });
            return { ok: false, to: toEmail, error: err.message };
          }
        })
      );

      logs.push(`Batch ${i + 1} finished: ${results.filter(r => r.ok).length} sent, ${results.filter(r => !r.ok).length} failed`);

      // If not last batch, pause
      if (i < batches.length - 1) {
        console.log(`⏸ Waiting ${PAUSE_MS}ms before next batch...`);
        logs.push(`Waiting ${PAUSE_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, PAUSE_MS));
      }
    }

    console.log("\n🎯 Summary:");
    console.log(`Total recipients: ${emails.length}`);
    console.log(`✅ Sent: ${sent}`);
    console.log(`❌ Failed: ${failed}`);

    logs.push(`Summary: Sent=${sent}, Failed=${failed}, Total=${emails.length}`);

    return res.json({
      ok: true,
      total: emails.length,
      sent,
      failed,
      batches: batches.length,
      logs,
      sampleErrors: errors.slice(0, 10),
    });

  } catch (err) {
    console.error("💥 sendDocument fatal error:", err);
    return res.status(500).json({ error: "Failed to send document", detail: err.message });
  }
};

module.exports = { sendDocument };
