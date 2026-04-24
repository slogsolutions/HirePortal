const { Queue } = require("bullmq");
const connection = require("../config/redis.config");

const mailQueue = new Queue("mail-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3, // retry 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // 5 sec → 10 → 20
    },
    removeOnComplete: true,
    removeOnFail: false, // keep failed jobs for debugging
  },
});

module.exports = mailQueue;