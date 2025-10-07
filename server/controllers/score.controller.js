const asyncHandler = require('express-async-handler');
const Score = require('../models/Score.model');
const Candidate = require('../models/Candidate.model');
const AuditLog = require('../models/AuditLog.model');

function computeWeighted(summary) {
  const hr = summary.hr?.score || 0;
  const tech = summary.technical?.score || 0;
  const founder = summary.founder?.score || 0;
  // calculate digit-by-digit: but simple arithmetic is fine here
  const weighted = (tech * 0.5) + (hr * 0.3) + (founder * 0.2);
  return Math.round(weighted * 100) / 100; // round to 2 decimals
}

/**
 * submitScore
 * - Creates a Score document
 * - Updates Candidate.scoresSummary.<round> with latest data
 * - Recomputes weightedAvg and optionally updates candidate.status
 */
const submitScore = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  const { round, score, comments } = req.body;

  if (!['hr','technical','founder'].includes(round)) {
    return res.status(400).json({ message: 'Invalid round' });
  }
  if (typeof score !== 'number') {
    return res.status(400).json({ message: 'score must be a number' });
  }

  // create score doc
  const s = await Score.create({
    candidate: candidateId,
    round,
    score,
    comments: comments || '',
    interviewer: req.user._id
  });

  // update candidate summary (latest)
  const update = {};
  update[`scoresSummary.${round}`] = {
    score,
    comments: comments || '',
    by: req.user._id,
    at: new Date()
  };

  await Candidate.findByIdAndUpdate(candidateId, { $set: update });

  // recompute weighted average using fresh candidate doc
  const candidate = await Candidate.findById(candidateId);
  candidate.scoresSummary.weightedAvg = computeWeighted(candidate.scoresSummary || {});
  // example rule: if weightedAvg >= 70 then mark 'offered' (you may change this)
  if (candidate.scoresSummary.weightedAvg >= 70) candidate.status = 'offered';
  await candidate.save();

  await AuditLog.create({
    actor: req.user._id,
    action: 'score_submitted',
    details: { candidateId, round, score, scoreDocId: s._id }
  });

  res.json({ score: s, weightedAvg: candidate.scoresSummary.weightedAvg });
});

/**
 * getScoresForCandidate
 * - returns all Score documents for a candidate (history)
 */
const getScoresForCandidate = asyncHandler(async (req, res) => {
  const candidateId = req.params.candidateId;
  const scores = await Score.find({ candidate: candidateId })
    .populate('interviewer', 'name email role')
    .sort({ createdAt: 1 });
  res.json(scores);
});

module.exports = { submitScore, getScoresForCandidate };
