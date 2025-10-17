// routes/interviewRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const {createRound, listRounds, getRound} = require('../controllers/interview.controller');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
// POST /candidates/:id/interviews
router.post('/:id/interviews', createRound);

// GET /candidates/:id/interviews
router.get('/:id/interviews', listRounds);

// GET /interviews/:roundId (optional)
router.get('/round/:roundId', getRound);

module.exports = router;
