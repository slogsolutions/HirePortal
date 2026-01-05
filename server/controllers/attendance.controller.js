const asyncHandler = require("express-async-handler");
const DailyEntry = require("../models/DailyEntry.model");
const Holiday = require("../models/Holiday.model");
const User = require("../models/User.model");
const mongoose = require("mongoose");

// Helper: normalize date to 00:00:00 UTC
function normalizeDateToUTCStart(d) {
  const date = d instanceof Date ? new Date(d) : new Date(d + "T00:00:00Z");
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/*
 GET /attendance/me?year=YYYY&month=MM
 Returns list of days for month with entries and holiday flags
*/
const getMyMonth = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log("DEV userId",userId,"from req.user._id ->",req.user._id);
  const today = new Date();
  const year = parseInt(req.query.year, 10) || today.getUTCFullYear();
  const month = parseInt(req.query.month, 10) || today.getUTCMonth() + 1;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const daysInMonth = end.getUTCDate();

  const entries = await DailyEntry.find({
    userId,
    date: { $gte: start, $lte: end },
  }).lean();

  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end },
  }).lean();

  const entriesMap = {};
  entries.forEach((e) => {
    entriesMap[e.date.toISOString().slice(0, 10)] = e;
  });

  const holidaysSet = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10))
  );

  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    const key = dt.toISOString().slice(0, 10);
    const weekday = dt.getUTCDay();

    const isSunday = weekday === 0;
    const isHoliday = holidaysSet.has(key);
    const entry = entriesMap[key] || null;

    let tag;

    // ---------- FINAL CORRECT LOGIC ----------

    // If Sunday
    if (isSunday) {
      tag = "Sunday";
    }

    // If Holiday
    else if (isHoliday) {
      tag = "Holiday";
    }

    // If Entry Exists → always respect DB
    else if (entry) {
      let t = (entry.tag || "").trim().toLowerCase();
      if (t === "onleave" || t === "leave" || t.includes("leave"))
        tag = "On Leave";
      else tag = entry.tag || "Working";
    }

    // No entry but past date = Missed
    else if (dt < today) {
      tag = "Missed";
    }

    // No entry + future = Future
    else {
      tag = "Future";
    }

    // -----------------------------------------

    const isEditable = !isSunday && !isHoliday && dt <= today;

    days.push({
      date: key,
      day: d,
      weekday,
      isSunday,
      isHoliday,
      tag,
      note: entry?.note || "",
      locked: !isEditable || tag === "Holiday",
    });
  }

  res.json({ year, month, days });
});

/*
 POST /attendance/me/entries
 Upsert entries for logged-in user
 Supports a secret forceEdit flag
*/
const saveMyEntriesBatch = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  console.log("enerted");
  const incoming = req.body.entries || [];
  const forceEdit = req.body.forceEdit || false; // <-- NEW
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ message: "entries array required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const results = [];
    for (const item of incoming) {
      if (!item.date || !item.tag) {
        results.push({
          date: item.date || null,
          ok: false,
          message: "date and tag required",
        });
        continue;
      }

      if (
        !["Working", "On Leave", "Holiday", "Missed", "Absent"].includes(
          item.tag
        )
      ) {
        results.push({ date: item.date, ok: false, message: "Invalid tag" });
        continue;
      }

      const date = normalizeDateToUTCStart(item.date);
      const weekday = date.getUTCDay();

      if (!forceEdit) {
        if (weekday === 0) {
          results.push({
            date: date.toISOString().slice(0, 10),
            ok: false,
            message: "Sunday cannot be edited",
          });
          continue;
        }
        if (item.tag === "Holiday") {
          results.push({
            date: date.toISOString().slice(0, 10),
            ok: false,
            message: "Holiday tag is admin-only",
          });
          continue;
        }
      }

      const upsert = await DailyEntry.findOneAndUpdate(
        { userId, date },
        {
          $set: {
            tag: item.tag,
            note: item.note || "",
            autoMarked: false,
            createdBy: userId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      results.push({
        date: date.toISOString().slice(0, 10),
        ok: true,
        entry: upsert,
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "batch save completed", results });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

/*
 Admin report aggregation
*/
const adminListReport = asyncHandler(async (req, res) => {
  const start = req.query.start
    ? normalizeDateToUTCStart(req.query.start)
    : normalizeDateToUTCStart(new Date());
  const end = req.query.end
    ? normalizeDateToUTCStart(req.query.end)
    : normalizeDateToUTCStart(new Date());
  const userId = req.query.userId;

  const match = { date: { $gte: start, $lte: end } };
  if (userId) match.userId = userId;

  const agg = await DailyEntry.aggregate([
    { $match: match },
    { $group: { _id: { userId: "$userId", tag: "$tag" }, count: { $sum: 1 } } },
    {
      $group: {
        _id: "$_id.userId",
        tags: { $push: { k: "$_id.tag", v: "$count" } },
      },
    },
    { $project: { userId: "$_id", tagCounts: { $arrayToObject: "$tags" } } },
  ]);

  res.json({
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    data: agg,
  });
});

/*
 Admin holiday management
*/
const adminAddHoliday = asyncHandler(async (req, res) => {
  const { date, name } = req.body;
  if (!date || !name)
    return res.status(400).json({ message: "date and name required" });

  const nd = normalizeDateToUTCStart(date);
  const h = await Holiday.findOneAndUpdate(
    { date: nd },
    { $set: { name, createdBy: req.user._id } },
    { upsert: true, new: true }
  );

  const users = await User.find({}, "_id").lean();
  const bulkOps = users.map((u) => ({
    updateOne: {
      filter: { userId: u._id, date: nd },
      update: {
        $setOnInsert: {
          userId: u._id,
          date: nd,
          tag: "Holiday",
          note: name,
          autoMarked: false,
          createdBy: req.user._id,
        },
      },
      upsert: true,
    },
  }));
  if (bulkOps.length) await DailyEntry.bulkWrite(bulkOps);

  res.json({ message: "Holiday added", holiday: h });
});

const adminListHolidays = asyncHandler(async (req, res) => {
  const holidays = await Holiday.find().sort({ date: 1 }).lean();
  res.json(holidays);
});

const adminRemoveHoliday = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const h = await Holiday.findByIdAndDelete(id);
  if (!h) return res.status(404).json({ message: "Holiday not found" });
  await DailyEntry.deleteMany({ date: h.date, tag: "Holiday" });
  res.json({ message: "Holiday removed" });
});

// Add to attendance.controller.js (below existing exports)

//
// Admin: list users (id, name, email, role)
//
const adminListUsers = asyncHandler(async (req, res) => {
  // minimal projection, add any fields you want
  const users = await User.find({}, "_id name email role").lean();
  res.json(users);
});

//
// Admin: get month for a specific user
// GET /attendance/admin/user/:userId?year=YYYY&month=MM
//
const adminGetUserMonth = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  // reuse same logic as getMyMonth but for given userId
  const today = new Date();
  const year = parseInt(req.query.year, 10) || today.getUTCFullYear();
  const month = parseInt(req.query.month, 10) || today.getUTCMonth() + 1;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const daysInMonth = end.getUTCDate();

  const entries = await DailyEntry.find({
    userId,
    date: { $gte: start, $lte: end },
  }).lean();

  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end },
  }).lean();

  const entriesMap = {};
  entries.forEach((e) => (entriesMap[e.date.toISOString().slice(0, 10)] = e));
  const holidaysSet = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10))
  );

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    const key = dt.toISOString().slice(0, 10);
    const weekday = dt.getUTCDay();
    const isSunday = weekday === 0;
    const holiday = holidaysSet.has(key);
    const entry = entriesMap[key] || null;

    let tag = "Working";
    if (isSunday || holiday) tag = "Holiday";
    else if (!entry && dt < today) tag = "Missed";
    else if (entry) tag = entry.tag;

    const isEditable = !isSunday && !holiday && dt <= today;
    days.push({
      date: key,
      day: d,
      weekday,
      isSunday,
      isHoliday: holiday,
      tag,
      note: entry?.note || "",
      locked: !isEditable || tag === "Holiday",
    });
  }

  res.json({ year, month, days });
});

//
// Admin: upsert entries for any user (single-batch for admin)
// POST /attendance/admin/entries
// body: { userId, entries: [{date, tag, note}], forceEdit }
const adminSaveEntriesBatch = asyncHandler(async (req, res) => {
  const actingUser = req.user._id;
  const userId = req.body.userId;
  const incoming = req.body.entries || [];
  const forceEdit = !!req.body.forceEdit;

  if (!userId) return res.status(400).json({ message: "userId required" });
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ message: "entries array required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const results = [];
    for (const item of incoming) {
      if (!item.date || !item.tag) {
        results.push({
          date: item.date || null,
          ok: false,
          message: "date and tag required",
        });
        continue;
      }
      if (
        !["Working", "On Leave", "Holiday", "Missed", "Absent"].includes(
          item.tag
        )
      ) {
        results.push({ date: item.date, ok: false, message: "Invalid tag" });
        continue;
      }

      const date = normalizeDateToUTCStart(item.date);
      const weekday = date.getUTCDay();

      // Admin may force edit; if not and weekend => block
      if (!forceEdit) {
        if (weekday === 0) {
          results.push({
            date: date.toISOString().slice(0, 10),
            ok: false,
            message: "Sunday cannot be edited",
          });
          continue;
        }
      }

      const upsert = await DailyEntry.findOneAndUpdate(
        { userId, date },
        {
          $set: {
            tag: item.tag,
            note: item.note || "",
            autoMarked: false,
            createdBy: actingUser,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      results.push({
        date: date.toISOString().slice(0, 10),
        ok: true,
        entry: upsert,
      });
    }

    await session.commitTransaction();
    session.endSession();
    res.json({ message: "admin batch save completed", results });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// Admin: today's reporting for all users
// GET /attendance/admin/today-report
//
const adminTodayReport = asyncHandler(async (req, res) => {
  // today's UTC start
  const now = new Date();
  const todayStart = normalizeDateToUTCStart(now); // 00:00 UTC of today
  const todayEnd = new Date(
    Date.UTC(
      todayStart.getUTCFullYear(),
      todayStart.getUTCMonth(),
      todayStart.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  // load users
  const users = await User.find({}, "_id name email role").lean();

  // fetch entries for today
  const entries = await DailyEntry.find({
    date: { $gte: todayStart, $lte: todayEnd },
  }).lean();

  // fetch holidays for today
  const holidays = await Holiday.find({
    date: { $gte: todayStart, $lte: todayEnd },
  }).lean();

  const entryMap = {}; // userId -> entry
  entries.forEach((e) => {
    const uid = String(e.userId);
    entryMap[uid] = e;
  });

  const holidaySet = new Set(
    holidays.map((h) => h.date.toISOString().slice(0, 10))
  );
  const keyToday = todayStart.toISOString().slice(0, 10);
  const weekday = todayStart.getUTCDay();
  const isSunday = weekday === 0;
  const isHoliday = holidaySet.has(keyToday);

  // Build result array
  const result = users.map((u) => {
    const uid = String(u._id);
    const entry = entryMap[uid] || null;
    let tag = "Pending"; // no entry yet (today)
    let note = "";
    if (isSunday) tag = "Holiday";
    if (isHoliday) tag = "Holiday";
    if (entry) {
      tag = entry.tag || "Working";
      note = entry.note || "";
    }
    // Keep same fields structure as other endpoints: date, day, weekday, isSunday, isHoliday, tag, note, locked
    const todayObj = {
      date: keyToday,
      day: todayStart.getUTCDate(),
      weekday,
      isSunday,
      isHoliday,
      tag,
      note,
      locked: false,
    };
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      today: todayObj,
    };
  });

  res.json({ date: keyToday, data: result });
});

module.exports = {
  getMyMonth,
  saveMyEntriesBatch,
  adminListReport,
  adminAddHoliday,
  adminListHolidays,
  adminRemoveHoliday,
  adminListUsers,
  adminGetUserMonth,
  adminSaveEntriesBatch,
  adminTodayReport,
};
