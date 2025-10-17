const express = require('express');
const router = express.Router();
const {
  createRound,
  updateRound,
  deleteRound,
  getRoundsForCandidateDetailed,
  getAllRounds
} = require('../controllers/score.controller');
const { protect } = require('../middlewares/auth.middleware'); // auth middleware

// Create a new round for candidate
router.post('/:candidateId/rounds', protect, createRound);

// Update round
router.put('/round/:roundId', protect, updateRound);

// Delete round
router.delete('/round/:roundId', protect, deleteRound);

// Get all rounds for a candidate (detailed)
router.get('/:candidateId/rounds-detailed', protect, getRoundsForCandidateDetailed);

// Get all rounds (admin dashboard)
router.get('/rounds', protect, getAllRounds);

module.exports = router;
