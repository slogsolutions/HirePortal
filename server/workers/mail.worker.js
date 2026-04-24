const mongoose = require("mongoose");
const { Worker } = require("bullmq");
const connection = require("../config/redis.config");

const nodemailer = require("nodemailer");
const axios = require("axios");

const User = require("../models/User.model");
const Document = require("../models/RulesDocument.model");

// ✅ Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ✅ Helper: split array into batches
const chunkArray = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
};

// 🔥 Start worker only after DB connects
const startWorker = async () => {
  try {
    // ✅ Connect MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });

    console.log("✅ Worker MongoDB Connected");

    const worker = new Worker(
      "mail-queue",
      async (job) => {
        try {
          const { docId, recipients, subject, text, html } = job.data;

          console.log("🚀 Worker started job:", job.id);

          let emails = [];

          // ✅ Get recipients
          if (recipients === "all") {
            const users = await User.find({}, { email: 1 });
            emails = users.map((u) => u.email);
          } else {
            emails = recipients;
          }

          if (!emails.length) {
            throw new Error("No recipients found");
          }

          // ✅ Get document
          const doc = await Document.findById(docId);
          if (!doc) {
            throw new Error("Document not found");
          }

          // ✅ Download file
          const fileResp = await axios.get(doc.cloudinaryUrl, {
            responseType: "arraybuffer",
          });

          const attachment = {
            filename: doc.filename,
            content: Buffer.from(fileResp.data),
          };

          // ✅ Batch emails
          const batches = chunkArray(emails, 20);

          for (const batch of batches) {
            const results = await Promise.allSettled(
              batch.map((email) =>
                transporter.sendMail({
                  from: process.env.SMTP_USER,
                  to: email,
                  subject,
                  text,
                  html,
                  attachments: [attachment],
                })
              )
            );

            // ✅ Log failures but don't stop
            results.forEach((res, i) => {
              if (res.status === "rejected") {
                console.log(`❌ Failed email: ${batch[i]}`, res.reason.message);
              } else {
                console.log(`✅ Sent to: ${batch[i]}`);
              }
            });

            // ⏱ Delay between batches (avoid spam blocking)
            await new Promise((r) => setTimeout(r, 1000));
          }

          console.log("✅ Job completed:", job.id);

        } catch (err) {
          console.error("❌ Job error:", err.message);
          throw err; // 🔥 Important for BullMQ retry
        }
      },
      { connection }
    );

    // ✅ Events
    worker.on("completed", (job) => {
      console.log(`🎉 Job ${job.id} done`);
    });

    worker.on("failed", (job, err) => {
      console.log(`❌ Job ${job.id} failed`, err.message);
    });

  } catch (err) {
    console.error("❌ Worker startup failed:", err);
    process.exit(1);
  }
};

startWorker();