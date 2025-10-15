// routes/interviewRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const {createRound, listRounds, getRound} = require('../controllers/interview.controller');

// POST /candidates/:id/interviews
router.post('/:id/interviews', createRound);

// GET /candidates/:id/interviews
router.get('/:id/interviews', listRounds);

// GET /interviews/:roundId (optional)
router.get('/round/:roundId', getRound);

module.exports = router;
