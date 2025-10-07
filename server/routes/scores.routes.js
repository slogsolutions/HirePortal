const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const { submitScore, getScoresForCandidate } = require('../controllers/score.controller.js');

const router = express.Router();

router.post('/:candidateId', protect, requireRole(['interviewer','hr','admin']), submitScore);
router.get('/:candidateId', protect, requireRole(['hr','admin','interviewer']), getScoresForCandidate);

module.exports = router;
