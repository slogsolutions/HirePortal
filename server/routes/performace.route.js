const express = require('express');
const router = express.Router();
const {
  createPerformance,
  getAllPerformances,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
} = require('../controllers/performance.controller');

// Create performance for candidate
router.post('/:id', createPerformance);

// Get all performances (optional ?employeeId=)
router.get('/', getAllPerformances);

// Get specific performance
router.get('/:performanceId', getPerformanceById);

// Update performance
router.put('/:performanceId', updatePerformance);

// Delete performance
router.delete('/:performanceId', deletePerformance);

module.exports = router;
