// jobs/fcmCleanupCron.js
// Cleanup job for stale FCM tokens
const cron = require("node-cron");
const NotificationService = require("../utils/notification.service");

/**
 * Clean up stale FCM tokens (not seen in last 90 days)
 * Runs daily at 2:00 AM server time
 */
async function cleanupStaleTokens() {
  try {
    console.log("[FCM Cleanup] 🧹 Starting stale token cleanup...");
    const deletedCount = await NotificationService.cleanupStaleTokens(90);
    console.log(`[FCM Cleanup]  Cleanup completed. Removed ${deletedCount} stale tokens.`);
  } catch (err) {
    console.error("[FCM Cleanup] ❌ Error during cleanup:", err);
  }
}

function startFcmCleanupCron() {
  // Schedule: every day at 2:00 AM server local time
  // cron format: 'm h dom mon dow'
  cron.schedule(
    "0 2 * * *",
    () => {
      console.log("[FCM Cleanup] ⏰ Cleanup cron triggered at", new Date().toISOString());
      cleanupStaleTokens();
    },
    {
      timezone: process.env.CRON_TZ || undefined,
    }
  );

  console.log("[FCM Cleanup]  Cleanup cron scheduled (every day at 2:00 AM server time).");
}

module.exports = { startFcmCleanupCron, cleanupStaleTokens };

