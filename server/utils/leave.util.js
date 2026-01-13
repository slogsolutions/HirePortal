const DailyEntry = require("../models/DailyEntry.model");

const normalizeToUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const markApprovedLeaveDays = async (
  userId,
  startDate,
  endDate,
  reviewerId,
  reason
) => {
  console.log("======== markApprovedLeaveDays CALLED ========");
  console.log("👤 userId going to DailyEntry:", userId);
  console.log("🧑 reviewerId (admin):", reviewerId);
  console.log("📆 range:", startDate, "→", endDate);
  console.log("📝 note:", reason);

  const start = normalizeToUTC(startDate);
  const end = normalizeToUTC(endDate);

  const days = [];
  let current = new Date(start);

  while (current <= end) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  console.log(
    "📌 Dates that will be marked:",
    days.map((d) => d.toISOString())
  );

  const bulkOps = days.map((date) => ({
    updateOne: {
      filter: { userId, date },
      update: {
        $set: {
          tag: "On Leave",
          note: reason || "Leave Approved",
          autoMarked: false,
          createdBy: reviewerId,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await DailyEntry.bulkWrite(bulkOps);
  }

  console.log(" BULK WRITE COMPLETED for user:", userId);
};

module.exports = {
  markApprovedLeaveDays,
};
