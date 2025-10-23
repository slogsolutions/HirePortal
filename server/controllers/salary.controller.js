const Salary = require('../models/Salary.model');
const Candidate = require('../models/Candidate.model');
const { calculateSalary } = require('../services/salaryCalculator.service');
const mongoose = require('mongoose');

/**
 * Helper to build salary payload + calculated snapshot
 */
function buildSalaryPayload(body, user) {
  // allowed writable fields from client
  const allowed = [
    'candidate','period','baseSalary','workingDaysInMonth','hoursPerDay',
    'advance','overtimeDays','overtimeHours','leavesTaken',
    'epf','bonus','expense','lateMinutes','adjustments','remarks','status'
  ];
  const payload = {};
  for (const k of allowed) if (body[k] !== undefined) payload[k] = body[k];

  // ensure numeric coercion for main numbers
  payload.baseSalary = Number(payload.baseSalary || 0);
  payload.workingDaysInMonth = Number(payload.workingDaysInMonth || 30);
  payload.hoursPerDay = Number(payload.hoursPerDay || 8);

  // calculate snapshot (use default multipliers; change if you have settings)
  const calc = calculateSalary(payload, { overtimeDayMultiplier: 1, overtimeHourMultiplier: 1 });

  // merge snapshot into payload
  Object.assign(payload, calc);

  // meta
  if (user && user._id) payload.createdBy = user._id;

  return payload;
}

// Create salary
exports.createSalary = async (req, res) => {
  try {
    const body = req.body;
    if (!body.candidate) return res.status(400).json({ error: 'candidate required' });
    // check candidate exists
    const cand = await Candidate.findById(body.candidate);
    if (!cand) return res.status(404).json({ error: 'candidate not found' });

    // prevent duplicate salary for same candidate+period (optional)
    if (!body.period || !body.period.month || !body.period.year) {
      // default to current period if not provided
      const now = new Date();
      body.period = { month: now.getMonth() + 1, year: now.getFullYear() };
    } else {
      // ensure numeric
      body.period.month = Number(body.period.month);
      body.period.year = Number(body.period.year);
    }

    const payload = buildSalaryPayload(body, req.user);
    // optional uniqueness check:
    const exists = await Salary.findOne({ candidate: payload.candidate, 'period.month': payload.period.month, 'period.year': payload.period.year });
    if (exists) {
      // you can allow OR return error; here return 409
      return res.status(409).json({ error: 'Salary for this candidate and period already exists', existingId: exists._id });
    }

    const doc = new Salary(payload);
    await doc.save();
    const populated = await doc.populate('candidate', 'firstName lastName email Designation');
    res.status(201).json(populated);
  } catch (err) {
    console.error('createSalary err', err);
    res.status(500).json({ error: err.message });
  }
};

// List salaries (paginate/filter)
exports.listSalaries = async (req, res) => {
  try {
    const { page = 1, limit = 50, candidate } = req.query;
    const q = {};
    if (candidate) q.candidate = candidate;
    const docs = await Salary.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('candidate', 'firstName lastName email Designation');
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get single salary
exports.getSalary = async (req, res) => {
  try {
    const doc = await Salary.findById(req.params.id).populate('candidate createdBy', 'firstName lastName email name');
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Update salary (recalculate snapshot)
exports.updateSalary = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });

    const body = req.body;
    const payload = buildSalaryPayload(body, req.user);

    const updated = await Salary.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete salary
exports.deleteSalary = async (req, res) => {
  try {
    const id = req.params.id;
    await Salary.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
