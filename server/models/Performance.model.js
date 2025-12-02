const mongoose = require('mongoose');

const employeePerformanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    period: {
      type: String, // e.g. "2025-Q1" or "Jan-Jun 2025"
      required: true,
    },
    performanceScore: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    feedback: {
      type: String,
      trim: true,
    },
    nextReview: Date,
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.EmployeePerformance ||
  mongoose.model('EmployeePerformance', employeePerformanceSchema);
