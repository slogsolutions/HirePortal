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
  adminRemoveHoliday,
  adminListUsers,
  adminGetUserMonth,
  adminSaveEntriesBatch,
  adminTodayReport
  
} = require('../controllers/attendance.controller');

const router = express.Router();

// User routes
router.get('/me', protect, getMyMonth); // ?year=2025&month=10 (month 1-12)
router.post('/me/entries', protect, saveMyEntriesBatch); // batch save

// Admin routes
router.get('/admin/report', protect, requireRole(['hr','admin']), adminListReport); // filters
router.post('/admin/holidays', protect, requireRole(['hr','admin']), adminAddHoliday);
router.get('/admin/today-report', protect, requireRole(['hr','admin']),adminTodayReport);

// add to top imports if not present
// const { getMyMonth, saveMyEntriesBatch, adminListReport, adminAddHoliday, adminListHolidays, adminRemoveHoliday } = require('../controllers/attendance.controller');
// add new exports: adminListUsers, adminGetUserMonth, adminSaveEntriesBatch

// Admin routes (append)
router.get('/admin/users', protect, requireRole(['hr','admin']), adminListUsers);
router.get('/admin/user/:userId', protect, requireRole(['hr','admin']), adminGetUserMonth);
router.post('/admin/entries', protect, requireRole(['hr','admin']), adminSaveEntriesBatch);

router.get('/admin/holidays', protect, requireRole(['hr','admin']), adminListHolidays);
router.delete('/admin/holidays/:id', protect, requireRole(['hr','admin']), adminRemoveHoliday);

module.exports = router;
