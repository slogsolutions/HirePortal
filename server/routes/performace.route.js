const express = require('express');
const router = express.Router();
const {
  createPerformance,
  getAllPerformances,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
  getMyPerformance,
} = require('../controllers/performance.controller');
const { protect } = require('../middlewares/auth.middleware');

// Create performance for candidate
router.post('/:id', createPerformance);

// Get all performances (optional ?employeeId=)
router.get('/', getAllPerformances);

router.get('/me', protect, getMyPerformance);


// Get specific performance
router.get('/:performanceId', getPerformanceById);

// Update performance
router.put('/:performanceId', updatePerformance);

// Delete performance
router.delete('/:performanceId', deletePerformance);

module.exports = router;
