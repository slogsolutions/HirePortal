const { Redis } = require("ioredis");

const connection = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT) || 6379,

  maxRetriesPerRequest: null, // required for BullMQ
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000); // reconnect delay
  },

  enableReadyCheck: true,
});

connection.on("connect", () => {
  console.log("🟢 Redis connected");
});

connection.on("error", (err) => {
  console.error("🔴 Redis error:", err.message);
});

module.exports = connection;