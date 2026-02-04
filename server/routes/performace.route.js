const express = require('express');
const router = express.Router();
const {
  createPerformance,
  getAllPerformances,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
  getMyPerformance,
  getLeaderboard,
  getAllCycles,
  getActiveCycle,
  closeCycle,
  getMonthlySummaries,
  getCycleSummary,
  getWarnings,
} = require('../controllers/performance.controller');
const { protect } = require('../middlewares/auth.middleware');

// Cycle management
router.get('/cycles', getAllCycles);
router.get('/cycles/active', getActiveCycle);
router.post('/cycles/:cycleId/close', protect, closeCycle);

// Warnings
router.get('/warnings', protect, getWarnings);

// Monthly summaries
router.get('/monthly/:employeeId', protect, getMonthlySummaries);

// Cycle summaries
router.get('/cycle-summary/:employeeId/:cycleId', protect, getCycleSummary);

// Leaderboard (with cycle support)
router.get('/leaderboard', getLeaderboard);

// My performance (candidate view)
router.get('/me', protect, getMyPerformance);

// Create performance review for candidate
router.post('/:id', protect, createPerformance);

// Get all performance reviews (with advanced filtering)
router.get('/', getAllPerformances);

// Get specific performance review
router.get('/:performanceId', getPerformanceById);

// Update performance review
router.put('/:performanceId', protect, updatePerformance);

// Delete performance review
router.delete('/:performanceId', protect, deletePerformance);

module.exports = router;
