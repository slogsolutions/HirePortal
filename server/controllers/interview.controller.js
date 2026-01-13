// controllers/interviewController.js
const InterviewRound = require('../models/InterviewRoundString.model');
const Candidate = require('../models/Candidate.model');

const createRound = async (req, res) => {
  try {
    const { id } = req.params; // candidate id
    const { interviewer, interviewerName, type, date, scores = {}, comments } = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    //  Sanitize scores (0–10 range)
    const sanitizedScores = {
      grooming: Math.max(0, Math.min(10, Number(scores.grooming || 0))),
      personality: Math.max(0, Math.min(10, Number(scores.personality || 0))),
      communication: Math.max(0, Math.min(10, Number(scores.communication || 0))),
      knowledge: Math.max(0, Math.min(10, Number(scores.knowledge || 0))),
    };

    const round = await InterviewRound.create({
      candidate: id,
      interviewer,
      interviewerName,
      type: type || 'Other',
      date: date ? new Date(date) : new Date(),
      scores: sanitizedScores,
      comments,
    });

    //  Update candidate’s score summary
    try {
      const rounds = await InterviewRound.find({ candidate: id });
      const totals = rounds.reduce((acc, r) => acc + r.total, 0);
      const weightedAvg = rounds.length ? (totals / (rounds.length * 40)) * 100 : 0;

      candidate.scoresSummary = candidate.scoresSummary || {};
      candidate.scoresSummary.weightedAvg = Math.round(weightedAvg * 100) / 100;
      await candidate.save();
    } catch (err) {
      console.warn('Failed to update candidate summary', err);
    }

    res.status(201).json(round);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to save interview round' });
  }
};

const listRounds = async (req, res) => {
  try {
    const { id } = req.params;
    const rounds = await InterviewRound.find({ candidate: id }).sort({ date: -1, createdAt: -1 });
    res.json(rounds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load rounds' });
  }
};

const getRound = async (req, res) => {
  try {
    const { roundId } = req.params;
    const round = await InterviewRound.findById(roundId);
    if (!round) return res.status(404).json({ message: 'Round not found' });
    res.json(round);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load round' });
  }
};

module.exports = { createRound, listRounds, getRound };
