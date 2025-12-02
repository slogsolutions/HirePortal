const Salary = require('../models/Salary.model');
const Candidate = require('../models/Candidate.model');
const { calculateSalary } = require('../services/salaryCalculator.service');
const mongoose = require('mongoose');

/**
 * Build salary payload + calculated snapshot
 */
function buildSalaryPayload(body, user) {
  const allowed = [
    'candidate','period','baseSalary','workingDaysInMonth','hoursPerDay',
    'advance','overtimeDays','overtimeHours','leavesTaken',
    'epf','bonus','expense','lateMinutes','adjustments','remarks','status'
  ];
  const payload = {};
  for (const k of allowed) if (body[k] !== undefined) payload[k] = body[k];

  // ensure numeric coercion
  payload.baseSalary = Number(payload.baseSalary || 0);
  payload.workingDaysInMonth = Number(payload.workingDaysInMonth || 30);
  payload.hoursPerDay = Number(payload.hoursPerDay || 8);

  // calculate snapshot
  const calc = calculateSalary(payload, { overtimeDayMultiplier: 1, overtimeHourMultiplier: 1 });
  Object.assign(payload, calc);

  // meta
  if (user && user._id) payload.createdBy = user._id;

  return payload;
}

/** EMPLOYEE: list own salaries */
exports.listMySalaries = async (req, res) => {
  try {
    const uid =
      req.user?.candidateId ||
      req.user?.candidate?._id ||
      req.user?._id ||
      req.user?.id;

    if (!uid) {
      return res.status(400).json({ message: 'User id not found in token' });
    }

    const docs = await Salary.find({
      $or: [{ candidate: uid }, { user: uid }, { employeeId: uid }],
    })
      .sort({ 'period.year': -1, 'period.month': -1, createdAt: -1 })
      .populate('candidate', 'firstName lastName email Designation')
      .lean();

    return res.json(Array.isArray(docs) ? docs : []);
  } catch (err) {
    console.error('listMySalaries error:', err);
    return res.status(500).json({ message: 'Server error listing salaries' });
  }
};
/**
 * Create or update salary automatically
 */
exports.createSalary = async (req, res) => {
  try {
    const body = req.body;
    if (!body.candidate) return res.status(400).json({ error: 'candidate required' });

    const cand = await Candidate.findById(body.candidate);
    if (!cand) return res.status(404).json({ error: 'candidate not found' });

    // Ensure period is set
    if (!body.period || !body.period.month || !body.period.year) {
      const now = new Date();
      body.period = { month: now.getMonth() + 1, year: now.getFullYear() };
    } else {
      body.period.month = Number(body.period.month);
      body.period.year = Number(body.period.year);
    }

    const payload = buildSalaryPayload(body, req.user);

    // Check if salary exists for candidate + period
    let existing = await Salary.findOne({
      candidate: payload.candidate,
      'period.month': payload.period.month,
      'period.year': payload.period.year
    });

    if (existing) {
      // Update existing
      existing = await Salary.findByIdAndUpdate(existing._id, payload, { new: true });
      const populated = await existing.populate('candidate', 'firstName lastName email Designation');
      return res.status(200).json({ message: "Salary updated", data: populated });
    }

    // Create new
    const doc = new Salary(payload);
    await doc.save();
    const populated = await doc.populate('candidate', 'firstName lastName email Designation');
    res.status(201).json({ message: "Salary created", data: populated });

  } catch (err) {
    console.error('createSalary err', err);
    res.status(500).json({ error: err.message });
  }
};

// Get salary history for candidate
exports.getSalaryById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const salaries = await Salary.find({ candidate: userId })
      .sort({ createdAt: -1 })
      .populate('candidate', 'firstName lastName email Designation');
    res.json(salaries);
  } catch (err) {
    console.error("Error fetching user salaries:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update salary manually
exports.updateSalary = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'invalid id' });

    const payload = buildSalaryPayload(req.body, req.user);
    const updated = await Salary.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ error: 'salary not found' });

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

// Get single salary by ID
exports.getSalary = async (req, res) => {
  try {
    const doc = await Salary.findById(req.params.id)
      .populate('candidate createdBy', 'firstName lastName email name');
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// List salaries (optional filter by candidate)
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
