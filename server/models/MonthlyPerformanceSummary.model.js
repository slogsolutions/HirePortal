const mongoose = require('mongoose');

const monthlyPerformanceSummarySchema = new mongoose.Schema(
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
    
    // Month identification
    month: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    cycleMonth: {
      type: Number,
      min: 1,
      max: 6,
      required: true,
    },
    
    // Reviews in this month
    reviews: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceReview'
    }],
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    
    // Calculated scores (CEILING average if 2 reviews)
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
    monthlyTag: {
      type: String,
      enum: ['Outstanding', 'Very Good', 'Average', 'Below Average', 'Worst', 'No Review'],
      default: 'No Review',
    },
    
    // Financial totals for month
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
    
    // Consecutive tracking
    isLowPerformance: {
      type: Boolean,
      default: false,
    },
    consecutiveLowCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasNoticePeriodWarning: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
monthlyPerformanceSummarySchema.index({ employee: 1, cycle: 1, cycleMonth: 1 }, { unique: true });
monthlyPerformanceSummarySchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });
monthlyPerformanceSummarySchema.index({ hasNoticePeriodWarning: 1 });
monthlyPerformanceSummarySchema.index({ cycle: 1 });

// Static method to update summary for a specific month
monthlyPerformanceSummarySchema.statics.updateSummaryForMonth = async function(employeeId, cycleId, year, month) {
  const PerformanceReview = require('./PerformanceReview.model');
  
  // Get all reviews for this employee in this month
  const reviews = await PerformanceReview.find({
    employee: employeeId,
    cycle: cycleId,
    reviewYear: year,
    reviewMonth: month
  }).sort({ reviewDate: 1 });
  
  if (reviews.length === 0) {
    // Delete summary if no reviews exist
    await this.deleteOne({ employee: employeeId, year, month });
    return null;
  }
  
  // Calculate scores
  const scores = reviews.map(r => r.performanceScore);
  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const ceilingAverageScore = Math.ceil(averageScore);
  
  // Calculate financials
  const totalIncentives = reviews.reduce((sum, r) => sum + r.incentiveAmount, 0);
  const totalPenalties = reviews.reduce((sum, r) => sum + r.penaltyAmount, 0);
  const netAmount = totalIncentives - totalPenalties;
  
  // Determine monthly tag based on ceiling average
  let monthlyTag;
  if (ceilingAverageScore === 5) monthlyTag = 'Outstanding';
  else if (ceilingAverageScore === 4) monthlyTag = 'Very Good';
  else if (ceilingAverageScore === 3) monthlyTag = 'Average';
  else if (ceilingAverageScore === 2) monthlyTag = 'Below Average';
  else monthlyTag = 'Worst';
  
  // Check for low performance (ceiling average <= 1)
  const isLowPerformance = ceilingAverageScore <= 1;
  
  // Check consecutive low performance
  let consecutiveLowCount = 0;
  let hasNoticePeriodWarning = false;
  
  if (isLowPerformance) {
    // Find previous month's summary
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    
    const prevSummary = await this.findOne({
      employee: employeeId,
      year: prevYear,
      month: prevMonth
    });
    
    if (prevSummary && prevSummary.isLowPerformance) {
      consecutiveLowCount = prevSummary.consecutiveLowCount + 1;
      hasNoticePeriodWarning = consecutiveLowCount >= 2;
    } else {
      consecutiveLowCount = 1;
    }
  }
  
  // Get cycleMonth from first review
  const cycleMonth = reviews[0].cycleMonth;
  
  // Update or create summary
  const summary = await this.findOneAndUpdate(
    { employee: employeeId, year, month },
    {
      employee: employeeId,
      cycle: cycleId,
      month,
      year,
      cycleMonth,
      reviews: reviews.map(r => r._id),
      reviewCount: reviews.length,
      averageScore: Math.round(averageScore * 10) / 10,
      ceilingAverageScore,
      monthlyTag,
      totalIncentives,
      totalPenalties,
      netAmount,
      isLowPerformance,
      consecutiveLowCount,
      hasNoticePeriodWarning,
    },
    { upsert: true, new: true }
  );
  
  return summary;
};

module.exports =
  mongoose.models.MonthlyPerformanceSummary ||
  mongoose.model('MonthlyPerformanceSummary', monthlyPerformanceSummarySchema);
