// models/Score.js
const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate', required: true, index: true },
  round: { type: String, enum: ['hr','technical','founder'], required: true },
  score: { type: Number, required: true },            // numeric score (e.g. 0-100)
  maxScore: { type: Number, default: 10 },           // optional max scale
  comments: { type: String, default: '' },
  interviewer: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  // in all fields  personality , communication , body language , salary  each fields rating rating each rounds comment 
});

// optional: prevent duplicate submissions by same interviewer for same round (if desired)
// scoreSchema.index({ candidate: 1, round: 1, interviewer: 1 }, { unique: true });

module.exports = mongoose.model('Score', scoreSchema);
