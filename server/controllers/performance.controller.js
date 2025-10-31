const EmployeePerformance = require('../models/Performance.model');
const Candidate = require('../models/Candidate.model');

// ✅ Create new performance record
const createPerformance = async (req, res) => {
  try {
    const { id } = req.params; // candidate id
    const { reviewer, period, performanceScore, feedback, nextReview } = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const performance = await EmployeePerformance.create({
      employee: id,
      reviewer,
      period,
      performanceScore,
      feedback,
      nextReview,
    });

    res.status(201).json(performance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create performance record' });
  }
};

// ✅ Get all performances (optional: filter by employee)
const getAllPerformances = async (req, res) => {
  try {
    const { employeeId } = req.query;

    const filter = employeeId ? { employee: employeeId } : {};
    const performances = await EmployeePerformance.find(filter)
      .populate('employee', 'firstName lastName email Designation')
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });

    res.json(performances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load performance records' });
  }
};

// ✅ Get performance by ID
const getPerformanceById = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const performance = await EmployeePerformance.findById(performanceId)
      .populate('employee', 'firstName lastName email')
      .populate('reviewer', 'name email');

    if (!performance) return res.status(404).json({ message: 'Performance record not found' });

    res.json(performance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load performance record' });
  }
};

// ✅ Get performance for the logged-in user (/me)
const getMyPerformance = async (req, res) => {
  try {
    const userId = req.user?._id; // assuming you have auth middleware that sets req.user

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. User not found in request.' });
    }

    const performances = await EmployeePerformance.find({ employee: userId })
      .populate('employee', 'firstName lastName email')
      .populate('reviewer', 'name email')
      .sort({ createdAt: -1 });

    if (!performances || performances.length === 0) {
      return res.status(404).json({ message: 'No performance records found for this user' });
    }

    res.json(performances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load your performance records' });
  }
};

// ✅ Update performance
const updatePerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const updated = await EmployeePerformance.findByIdAndUpdate(performanceId, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: 'Performance record not found' });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update performance record' });
  }
};

// ✅ Delete performance
const deletePerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const deleted = await EmployeePerformance.findByIdAndDelete(performanceId);
    if (!deleted) return res.status(404).json({ message: 'Performance record not found' });

    res.json({ message: 'Performance record deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete performance record' });
  }
};

module.exports = {
  createPerformance,
  getAllPerformances,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
  getMyPerformance,
};
