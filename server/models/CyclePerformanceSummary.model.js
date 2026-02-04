const mongoose = require('mongoose');

const cyclePerformanceSummarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceCycle',
      required: true,
    },
    
    // Aggregated statistics
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthsWithReviews: {
      type: Number,
      default: 0,
      min: 0,
      max: 6,
    },
    
    // Score statistics
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ceilingAverageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    finalPerformanceTag: {
      type: String,
      enum: ['Outstanding', 'Very Good', 'Average', 'Below Average', 'Worst', 'No Review'],
      default: 'No Review',
    },
    
    // Financial totals
    totalIncentives: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPenalties: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      default: 0,
    },
    
    // Performance breakdown
    outstandingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    veryGoodCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    belowAverageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    worstCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Warning flags
    hadConsecutiveLowPerformance: {
      type: Boolean,
      default: false,
    },
    hadNoticePeriodWarning: {
      type: Boolean,
      default: false,
    },
    
    // Status
    isFrozen: {
      type: Boolean,
      default: false,
    },
    frozenAt: Date,
  },
  { timestamps: true }
);

// Indexes
cyclePerformanceSummarySchema.index({ employee: 1, cycle: 1 }, { unique: true });
cyclePerformanceSummarySchema.index({ cycle: 1 });
cyclePerformanceSummarySchema.index({ hadNoticePeriodWarning: 1 });
cyclePerformanceSummarySchema.index({ isFrozen: 1 });

// Static method to update summary for a cycle
cyclePerformanceSummarySchema.statics.updateSummaryForCycle = async function(employeeId, cycleId) {
  const PerformanceReview = require('./PerformanceReview.model');
  const MonthlyPerformanceSummary = require('./MonthlyPerformanceSummary.model');
  
  // Get all reviews for this employee in this cycle
  const reviews = await PerformanceReview.find({
    employee: employeeId,
    cycle: cycleId
  });
  
  // Get all monthly summaries for this cycle
  const monthlySummaries = await MonthlyPerformanceSummary.find({
    employee: employeeId,
    cycle: cycleId
  });
  
  if (reviews.length === 0) {
    // Delete summary if no reviews exist
    await this.deleteOne({ employee: employeeId, cycle: cycleId });
    return null;
  }
  
  // Calculate statistics
  const totalReviews = reviews.length;
  const monthsWithReviews = monthlySummaries.length;
  
  // Calculate average from monthly ceiling averages (not individual reviews)
  const monthlyScores = monthlySummaries.map(m => m.ceilingAverageScore).filter(s => s > 0);
  const averageScore = monthlyScores.length > 0
    ? monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length
    : 0;
  const ceilingAverageScore = Math.ceil(averageScore);
  
  // Determine final performance tag
  let finalPerformanceTag;
  if (ceilingAverageScore === 5) finalPerformanceTag = 'Outstanding';
  else if (ceilingAverageScore === 4) finalPerformanceTag = 'Very Good';
  else if (ceilingAverageScore === 3) finalPerformanceTag = 'Average';
  else if (ceilingAverageScore === 2) finalPerformanceTag = 'Below Average';
  else if (ceilingAverageScore === 1) finalPerformanceTag = 'Worst';
  else finalPerformanceTag = 'No Review';
  
  // Calculate financial totals
  const totalIncentives = reviews.reduce((sum, r) => sum + r.incentiveAmount, 0);
  const totalPenalties = reviews.reduce((sum, r) => sum + r.penaltyAmount, 0);
  const netAmount = totalIncentives - totalPenalties;
  
  // Performance breakdown
  const outstandingCount = reviews.filter(r => r.performanceScore === 5).length;
  const veryGoodCount = reviews.filter(r => r.performanceScore === 4).length;
  const averageCount = reviews.filter(r => r.performanceScore === 3).length;
  const belowAverageCount = reviews.filter(r => r.performanceScore === 2).length;
  const worstCount = reviews.filter(r => r.performanceScore === 1).length;
  
  // Warning flags
  const hadConsecutiveLowPerformance = monthlySummaries.some(m => m.isLowPerformance);
  const hadNoticePeriodWarning = monthlySummaries.some(m => m.hasNoticePeriodWarning);
  
  // Check if cycle is closed (don't modify frozen summaries)
  const existingSummary = await this.findOne({ employee: employeeId, cycle: cycleId });
  if (existingSummary && existingSummary.isFrozen) {
    return existingSummary; // Don't update frozen summaries
  }
  
  // Update or create summary
  const summary = await this.findOneAndUpdate(
    { employee: employeeId, cycle: cycleId },
    {
      employee: employeeId,
      cycle: cycleId,
      totalReviews,
      monthsWithReviews,
      averageScore: Math.round(averageScore * 10) / 10,
      ceilingAverageScore,
      finalPerformanceTag,
      totalIncentives,
      totalPenalties,
      netAmount,
      outstandingCount,
      veryGoodCount,
      averageCount,
      belowAverageCount,
      worstCount,
      hadConsecutiveLowPerformance,
      hadNoticePeriodWarning,
    },
    { upsert: true, new: true }
  );
  
  return summary;
};

module.exports =
  mongoose.models.CyclePerformanceSummary ||
  mongoose.model('CyclePerformanceSummary', cyclePerformanceSummarySchema);
