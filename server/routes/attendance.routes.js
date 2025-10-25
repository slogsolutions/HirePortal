// routes/attendance.route.js
const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const {
  getMyMonth,
  saveMyEntriesBatch,
  adminListReport,
  adminAddHoliday,
  adminListHolidays,
  adminRemoveHoliday
} = require('../controllers/attendance.controller');

const router = express.Router();

// User routes
router.get('/me', protect, getMyMonth); // ?year=2025&month=10 (month 1-12)
router.post('/me/entries', protect, saveMyEntriesBatch); // batch save

// Admin routes
router.get('/admin/report', protect, requireRole(['hr','admin']), adminListReport); // filters
router.post('/admin/holidays', protect, requireRole(['hr','admin']), adminAddHoliday);
router.get('/admin/holidays', protect, requireRole(['hr','admin']), adminListHolidays);
router.delete('/admin/holidays/:id', protect, requireRole(['hr','admin']), adminRemoveHoliday);

module.exports = router;
