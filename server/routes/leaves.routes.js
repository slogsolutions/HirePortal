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
const {requireRole} = require("../middlewares/roles.middleware")

router.use(protect);

// create leave
router.post('/', requireRole(['hr','admin']),createLeave);

// admin or reviewers: get all leaves (will be filtered by controller based on role)
router.get('/', getLeaves);

// get only my leaves (authenticated user)
router.get('/me', getMyLeaves);

// get single leave by id
router.get('/:id', getLeaveById);

// applicant modifies their pending leave
router.patch('/:id', updateLeave);

// applicant or admin delete (owner only pending)
router.delete('/:id', deleteLeave);

module.exports = router;
