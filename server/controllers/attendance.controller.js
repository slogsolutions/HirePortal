const asyncHandler = require('express-async-handler');
const DailyEntry = require('../models/DailyEntry.model');
const Holiday = require('../models/Holiday.model');
const User = require('../models/User.model');
const mongoose = require('mongoose');

// Helper: normalize date to 00:00:00 UTC
function normalizeDateToUTCStart(d) {
  const date = d instanceof Date ? new Date(d) : new Date(d + 'T00:00:00Z');
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/*
 GET /attendance/me?year=YYYY&month=MM
 Returns list of days for month with entries and holiday flags
*/
const getMyMonth = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = new Date();
  const year = parseInt(req.query.year, 10) || today.getUTCFullYear();
  const month = parseInt(req.query.month, 10) || (today.getUTCMonth() + 1); // 1-12

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const daysInMonth = end.getUTCDate();

  const entries = await DailyEntry.find({
    userId,
    date: { $gte: start, $lte: end }
  }).lean();

  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end }
  }).lean();

  const entriesMap = {};
  entries.forEach(e => entriesMap[e.date.toISOString().slice(0,10)] = e);
  const holidaysSet = new Set(holidays.map(h => h.date.toISOString().slice(0,10)));

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(Date.UTC(year, month - 1, d));
    const key = dt.toISOString().slice(0,10);
    const weekday = dt.getUTCDay();
    const isSunday = weekday === 0;
    const holiday = holidaysSet.has(key);
    const entry = entriesMap[key] || null;

    let tag = 'Working';
    if (isSunday || holiday) tag = 'Holiday';
    else if (!entry && dt < today) tag = 'Missed';
    else if (entry) tag = entry.tag;

    const isEditable = !isSunday && !holiday && dt <= today;
    days.push({
      date: key,
      day: d,
      weekday,
      isSunday,
      isHoliday: holiday,
      tag,
      note: entry?.note || '',
      locked: !isEditable || tag === 'Holiday'
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
        results.push({ date: item.date || null, ok: false, message: 'date and tag required' });
        continue;
      }

      if (!['Working','On Leave','Holiday','Missed','Absent'].includes(item.tag)) {
        results.push({ date: item.date, ok: false, message: 'Invalid tag' });
        continue;
      }

      const date = normalizeDateToUTCStart(item.date);
      const weekday = date.getUTCDay();

      if (!forceEdit) {
        if (weekday === 0) {
          results.push({ date: date.toISOString().slice(0,10), ok: false, message: 'Sunday cannot be edited' });
          continue;
        }
        if (item.tag === 'Holiday') {
          results.push({ date: date.toISOString().slice(0,10), ok: false, message: 'Holiday tag is admin-only' });
          continue;
        }
      }

      const upsert = await DailyEntry.findOneAndUpdate(
        { userId, date },
        { $set: { tag: item.tag, note: item.note || '', autoMarked: false, createdBy: userId } },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      results.push({ date: date.toISOString().slice(0,10), ok: true, entry: upsert });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'batch save completed', results });
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
  const start = req.query.start ? normalizeDateToUTCStart(req.query.start) : normalizeDateToUTCStart(new Date());
  const end = req.query.end ? normalizeDateToUTCStart(req.query.end) : normalizeDateToUTCStart(new Date());
  const userId = req.query.userId;

  const match = { date: { $gte: start, $lte: end } };
  if (userId) match.userId = userId;

  const agg = await DailyEntry.aggregate([
    { $match: match },
    { $group: { _id: { userId: '$userId', tag: '$tag' }, count: { $sum: 1 } } },
    { $group: { _id: '$_id.userId', tags: { $push: { k: '$_id.tag', v: '$count' } } } },
    { $project: { userId: '$_id', tagCounts: { $arrayToObject: '$tags' } } }
  ]);

  res.json({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), data: agg });
});

/*
 Admin holiday management
*/
const adminAddHoliday = asyncHandler(async (req, res) => {
  const { date, name } = req.body;
  if (!date || !name) return res.status(400).json({ message: 'date and name required' });

  const nd = normalizeDateToUTCStart(date);
  const h = await Holiday.findOneAndUpdate({ date: nd }, { $set: { name, createdBy: req.user._id } }, { upsert: true, new: true });

  const users = await User.find({}, '_id').lean();
  const bulkOps = users.map(u => ({
    updateOne: {
      filter: { userId: u._id, date: nd },
      update: { $setOnInsert: { userId: u._id, date: nd, tag: 'Holiday', note: name, autoMarked: false, createdBy: req.user._id } },
      upsert: true
    }
  }));
  if (bulkOps.length) await DailyEntry.bulkWrite(bulkOps);

  res.json({ message: 'Holiday added', holiday: h });
});

const adminListHolidays = asyncHandler(async (req, res) => {
  const holidays = await Holiday.find().sort({ date: 1 }).lean();
  res.json(holidays);
});

const adminRemoveHoliday = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const h = await Holiday.findByIdAndDelete(id);
  if (!h) return res.status(404).json({ message: 'Holiday not found' });
  await DailyEntry.deleteMany({ date: h.date, tag: 'Holiday' });
  res.json({ message: 'Holiday removed' });
});

module.exports = {
  getMyMonth,
  saveMyEntriesBatch,
  adminListReport,
  adminAddHoliday,
  adminListHolidays,
  adminRemoveHoliday
};
