const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salary.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require("../middlewares/roles.middleware");

// Public read (optional) — require auth & role
router.get('/', protect, requireRole(['hr', 'admin', 'superadmin']), (req, res, next) => {
  console.log('[API] GET /api/salaries by', req.user?.email || req.user?.id);
  next();
}, salaryController.listSalaries);

router.get('/:id', protect, requireRole(['hr', 'admin', 'superadmin']), (req, res, next) => {
  console.log('[API] GET /api/salaries/:id', req.params.id, 'by', req.user?.email || req.user?.id);
  next();
}, salaryController.getSalary);

// create/update/delete — HR or superadmin only
router.post('/', protect, requireRole(['hr', 'admin', 'superadmin']), (req, res, next) => {
  console.log('[API] POST /api/salaries payload:', { candidate: req.body?.candidate, month: req.body?.month, createdBy: req.user?.email });
  next();
}, salaryController.createSalary);

router.put('/:id', protect, requireRole(['hr', 'admin', 'superadmin']), (req, res, next) => {
  console.log('[API] PUT /api/salaries/:id', req.params.id, 'by', req.user?.email || req.user?.id);
  next();
}, salaryController.updateSalary);

router.delete('/:id', protect, requireRole(['hr', 'admin', 'superadmin']), (req, res, next) => {
  console.log('[API] DELETE /api/salaries/:id', req.params.id, 'by', req.user?.email || req.user?.id);
  next();
}, salaryController.deleteSalary);

module.exports = router;
