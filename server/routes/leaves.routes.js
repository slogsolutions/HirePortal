const express = require('express');
const router = express.Router();
const {
  createLeave,
  getLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
  getMyLeaves,
} = require('../controllers/leaves.controller');
const { protect } = require('../middlewares/auth.middleware'); // your auth middleware
const {requireRole} = require("../middlewares/roles.middleware");

router.use(protect);

// create leave
router.post('/', requireRole(['hr','admin','employee','manager']),createLeave);

// admin or reviewers: get all leaves (will be filtered by controller based on role)
router.get('/',  requireRole(['hr','admin','employee','manager']),getLeaves);

// get only my leaves (authenticated user)
router.get('/me', requireRole(['hr','admin','employee','manager']), getMyLeaves);

// get single leave by id
router.get('/:id',  requireRole(['hr','admin','employee','manager']), getLeaveById);

// applicant modifies their pending leave
router.patch('/:id',  requireRole(['hr','admin','employee','manager']), updateLeave);

// applicant or admin delete (owner only pending)
router.delete('/:id',  requireRole(['hr','admin','employee','manager']), deleteLeave);

module.exports = router;
