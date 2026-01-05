// jobs/attendanceCron.js
// Requires: npm i node-cron
const cron = require("node-cron");
const User = require("../models/User.model");
const DailyEntry = require("../models/DailyEntry.model");
const Holiday = require("../models/Holiday.model");

/*
  This job runs daily at 12:00 server time.
  It marks YESTERDAY as Absent for users who:
    - are employees
    - yesterday is not Sunday
    - yesterday is not a Holiday (admin set)
    - no DailyEntry exists for that user & date
*/
async function markYesterdayMissed() {
  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const date = new Date(
      Date.UTC(
        yesterday.getUTCFullYear(),
        yesterday.getUTCMonth(),
        yesterday.getUTCDate()
      )
    );

    const weekday = date.getUTCDay(); // 0 Sunday
    if (weekday === 0) return;


    // Holiday check using day-range
    const start = new Date(date);
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 1);

    const holiday = await Holiday.findOne({
      date: { $gte: start, $lt: end },
    }).lean();

    if (holiday) return;

    const users = await User.find({ role: "employee" }, "_id").lean();
    if (!users.length) return;

    const bulkOps = [];
    for (const u of users) {
      const exists = await DailyEntry.findOne({ userId: u._id, date }).lean();
      if (!exists) {
        bulkOps.push({
          insertOne: {
            document: {
              userId: u._id,
              date,
              tag: "Missed", // previously Absent
              note: "Auto-marked, no reporting by user",
              autoMarked: true,
              createdBy: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        });
      }
    }

    if (bulkOps.length) {
      await DailyEntry.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error("Attendance cron failed:", err);
  }
}

function startCron() {
  // schedule: every day at 12:00 (noon) server local time
  // cron format: 'm h dom mon dow'
  cron.schedule(
    "0 12 * * *",
    () => {
      console.log("Attendance cron triggered at", new Date().toISOString());
      markYesterdayMissed();
    },
    {
      timezone: process.env.CRON_TZ || undefined,
    }
  );
  console.log("Attendance cron scheduled (every day at 12:00 server time).");
}

module.exports = { startCron, markYesterdayMissed };

// What This Cron Does

// Every day at 12:00 PM (IST):

// Takes yesterday’s date

// Checks if it was Sunday or a declared holiday → skip

// Looks for any DailyEntry documents without a tag (i.e., user didn’t fill it)

// Marks them automatically as:
