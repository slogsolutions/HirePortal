// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const { createLeave,
  getLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
//   reviewLeave
} = require('../controllers/leaves.controller');
const { protect } = require('../middlewares/auth.middleware'); // your auth middleware

router.use(protect);

router.post('/', createLeave);
router.get('/',  getLeaves);
router.get('/:id',  getLeaveById);

// applicant modifies their pending leave
router.patch('/:id',  updateLeave);

// reviewer approves/rejects
// router.patch('/:id/review',  reviewLeave);

// applicant or admin delete (owner only pending)
router.delete('/:id',  deleteLeave);

// optional: keep cancel endpoint for convenience (alias to patch with status=cancelled if you want)
// router.patch('/:id/cancel',  cancelLeave);

module.exports = router;
