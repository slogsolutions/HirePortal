const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema({
  grooming: { type: Number, min: 0, max: 10, default: 0 },
  personality: { type: Number, min: 0, max: 10, default: 0 },
  communication: { type: Number, min: 0, max: 10, default: 0 },
  knowledge: { type: Number, min: 0, max: 10, default: 0 },
});

const interviewRoundStringSchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: "Candidate", required: true },
  interviewer: { type: String, required: true, trim: true }, // string now
  interviewerName: { type: String, trim: true },
  type: {
    type: String,
    enum: ["HR", "Technical", "Director", "Round 1", "Round 2", "Round 3", "Other"],
    default: "Other",
  },
  date: { type: Date, default: Date.now },
  scores: { type: scoreSchema, required: true },
  total: { type: Number, min: 0, max: 40 },
  comments: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

interviewRoundStringSchema.pre("save", function (next) {
  const s = this.scores || {};
  this.total =
    Number(s.grooming || 0) +
    Number(s.personality || 0) +
    Number(s.communication || 0) +
    Number(s.knowledge || 0);
  next();
});

module.exports =
  mongoose.models.InterviewRoundString ||
  mongoose.model("InterviewRoundString", interviewRoundStringSchema);
