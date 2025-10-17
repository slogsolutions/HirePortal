const asyncHandler = require('express-async-handler');
const InterviewRound = require('../models/InterviewRoundString.model');
const AuditLog = require('../models/AuditLog.model');

// Utility: safely compute total from scores
function computeTotal(scores) {
  if (!scores || typeof scores !== 'object') return 0;
  const keys = ['grooming','personality','communication','knowledge'];
  return keys.reduce((sum, k) => sum + (Number(scores[k]) || 0), 0);
}

/**
 * Create a new interview round
 */
const createRound = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  const { type, scores, comments, date, interviewerName } = req.body;

  if (!candidateId) return res.status(400).json({ message: 'Candidate ID is required' });
  if (!scores || typeof scores !== 'object') return res.status(400).json({ message: 'Scores are required' });

  const round = await InterviewRound.create({
    candidate: candidateId,
    type: type || 'Other',
    scores,
    total: computeTotal(scores),
    comments: comments || '',
    date: date ? new Date(date) : new Date(),
    interviewerName: interviewerName || req.user?.name || 'Unknown'
  });

  await AuditLog.create({
    actor: req.user?._id,
    action: 'round_created',
    details: { candidateId, roundId: round._id }
  });

  res.status(201).json(round);
});

/**
 * Update an existing round
 */
const updateRound = asyncHandler(async (req, res) => {
  const { roundId } = req.params;
  const { type, scores, comments, date, interviewerName } = req.body;

  const round = await InterviewRound.findById(roundId);
  if (!round) return res.status(404).json({ message: 'Round not found' });

  if (type) round.type = type;
  if (scores) {
    round.scores = scores;
    round.total = computeTotal(scores);
  }
  if (comments !== undefined) round.comments = comments;
  if (date) round.date = new Date(date);
  if (interviewerName) round.interviewerName = interviewerName;

  await round.save();

  await AuditLog.create({
    actor: req.user?._id,
    action: 'round_updated',
    details: { roundId }
  });

  res.json(round);
});

/**
 * Delete a round
 */
const deleteRound = asyncHandler(async (req, res) => {
  const { roundId } = req.params;
  const round = await InterviewRound.findById(roundId);
  if (!round) return res.status(404).json({ message: 'Round not found' });

  await InterviewRound.findByIdAndDelete(roundId);

  await AuditLog.create({
    actor: req.user?._id,
    action: 'round_deleted',
    details: { roundId }
  });

  res.json({ message: 'Round deleted successfully' });
});

/**
 * Get all rounds for a specific candidate
 */
const getRoundsForCandidate = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;

  const rounds = await InterviewRound.find({ candidate: candidateId })
    .populate('interviewer', 'name email role')
    .sort({ date: 1 });

  res.json(rounds);
});

/**
 * Get all rounds (admin dashboard)
 */
const getAllRounds = asyncHandler(async (req, res) => {
  const rounds = await InterviewRound.find()
    .populate('candidate', 'firstName lastName email status')
    .populate('interviewer', 'name email role')
    .sort({ date: -1 });

  res.json(rounds);
});

// Get all rounds for a specific candidate with detailed fields
const getRoundsForCandidateDetailed = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;

  if (!candidateId) return res.status(400).json({ message: 'Candidate ID is required' });

  const rounds = await InterviewRound.find({ candidate: candidateId })
    .populate('interviewer', 'name email role')
    .sort({ date: 1 })
    .lean(); // use lean to return plain JS objects

  // Ensure each round has total safely calculated
  const detailedRounds = rounds.map(r => ({
    _id: r._id,
    type: r.type,
    date: r.date,
    interviewer: r.interviewer,
    interviewerName: r.interviewerName || (r.interviewer?.name || 'Unknown'),
    scores: r.scores || {},
    total: r.total || 0,
    comments: r.comments || '',
    createdAt: r.createdAt
  }));

  res.json(detailedRounds);
});


module.exports = {
  createRound,
  updateRound,
  deleteRound,
  getRoundsForCandidate,
  getAllRounds,
  getRoundsForCandidateDetailed
};
