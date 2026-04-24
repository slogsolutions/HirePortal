// Add Queue Events (monitoring)
const { QueueEvents } = require("bullmq");
const connection = require("../config/redis.config");

const queueEvents = new QueueEvents("mail-queue", { connection });

queueEvents.on("completed", ({ jobId }) => {
  console.log(`🎉 Job ${jobId} completed`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`❌ Job ${jobId} failed: ${failedReason}`);
});