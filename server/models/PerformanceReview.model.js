const mongoose = require('mongoose');

// Performance tags based on score
const PERFORMANCE_TAGS = {
  OUTSTANDING: 'Outstanding',
  VERY_GOOD: 'Very Good',
  AVERAGE: 'Average',
  BELOW_AVERAGE: 'Below Average',
  WORST: 'Worst'
};

// Get performance tag based on score
const getPerformanceTag = (score) => {
  if (score === 5) return PERFORMANCE_TAGS.OUTSTANDING;
  if (score === 4) return PERFORMANCE_TAGS.VERY_GOOD;
  if (score === 3) return PERFORMANCE_TAGS.AVERAGE;
  if (score === 2) return PERFORMANCE_TAGS.BELOW_AVERAGE;
  if (score === 1) return PERFORMANCE_TAGS.WORST;
  return PERFORMANCE_TAGS.AVERAGE;
};

// Calculate default incentive/penalty based on score
const calculateDefaultFinancials = (score) => {
  if (score === 5) return { incentive: 1000, penalty: 0 };
  if (score === 4) return { incentive: 500, penalty: 0 };
  if (score === 3) return { incentive: 0, penalty: 0 };
  if (score === 2) return { incentive: 0, penalty: 10 };
  if (score === 1) return { incentive: 0, penalty: 50 };
  return { incentive: 0, penalty: 0 };
};

const performanceReviewSchema = new mongoose.Schema(
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
    cycle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PerformanceCycle',
      required: true,
    },
    
    // Date tracking - CRITICAL CHANGE: reviewForMonth instead of nextReview
    reviewDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    reviewForMonth: {
      type: Date,
      required: true,
      // This is the month the admin is reviewing (e.g., "January 2025")
      // Admin selects this to indicate which month's performance they're evaluating
    },
    reviewMonth: {
      type: Number,
      min: 1,
      max: 12,
      // Auto-calculated from reviewForMonth in pre-save
    },
    reviewYear: {
      type: Number,
      // Auto-calculated from reviewForMonth in pre-save
    },
    cycleMonth: {
      type: Number,
      min: 1,
      max: 6,
      // Auto-calculated from cycle and reviewForMonth in pre-save
    },
    
    // Performance data
    performanceScore: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    performanceTag: {
      type: String,
      enum: Object.values(PERFORMANCE_TAGS),
      // Auto-calculated from performanceScore in pre-save
    },
    feedback: {
      type: String,
      trim: true,
      required: true,
    },
    
    // Financial (auto-calculated unless overridden)
    incentiveAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    penaltyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Admin overrides (optional)
    incentiveOverride: {
      type: Number,
      min: 0,
    },
    penaltyOverride: {
      type: Number,
      min: 0,
    },
    overrideReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
performanceReviewSchema.index({ employee: 1, cycle: 1 });
performanceReviewSchema.index({ employee: 1, reviewYear: 1, reviewMonth: 1 });
performanceReviewSchema.index({ cycle: 1, employee: 1 });
performanceReviewSchema.index({ reviewDate: 1 });
performanceReviewSchema.index({ reviewForMonth: 1 });

// Pre-save middleware to auto-calculate derived fields
performanceReviewSchema.pre('save', async function(next) {
  // Auto-set performance tag
  this.performanceTag = getPerformanceTag(this.performanceScore);
  
  // Auto-calculate incentive/penalty (use override if provided)
  if (this.incentiveOverride !== undefined && this.incentiveOverride !== null) {
    this.incentiveAmount = this.incentiveOverride;
  } else {
    const { incentive } = calculateDefaultFinancials(this.performanceScore);
    this.incentiveAmount = incentive;
  }
  
  if (this.penaltyOverride !== undefined && this.penaltyOverride !== null) {
    this.penaltyAmount = this.penaltyOverride;
  } else {
    const { penalty } = calculateDefaultFinancials(this.performanceScore);
    this.penaltyAmount = penalty;
  }
  
  // Extract month/year from reviewForMonth
  const reviewForDate = new Date(this.reviewForMonth);
  this.reviewMonth = reviewForDate.getMonth() + 1; // 1-12
  this.reviewYear = reviewForDate.getFullYear();
  
  // Calculate cycleMonth (1-6 within the cycle)
  const PerformanceCycle = require('./PerformanceCycle.model');
  const cycle = await PerformanceCycle.findById(this.cycle);
  
  if (cycle) {
    const cycleStartMonth = cycle.startDate.getMonth(); // 0-11
    const reviewMonthIndex = reviewForDate.getMonth(); // 0-11
    
    // Calculate month within cycle (1-6)
    let cycleMonth;
    if (reviewMonthIndex >= cycleStartMonth) {
      cycleMonth = reviewMonthIndex - cycleStartMonth + 1;
    } else {
      // Handle year boundary (e.g., cycle starts in July, review in January)
      cycleMonth = 12 - cycleStartMonth + reviewMonthIndex + 1;
    }
    
    this.cycleMonth = Math.min(Math.max(cycleMonth, 1), 6);
  }
  
  next();
});

// Post-save middleware to update summaries
performanceReviewSchema.post('save', async function(doc) {
  try {
    // Update monthly summary
    const MonthlyPerformanceSummary = require('./MonthlyPerformanceSummary.model');
    await MonthlyPerformanceSummary.updateSummaryForMonth(
      doc.employee,
      doc.cycle,
      doc.reviewYear,
      doc.reviewMonth
    );
    
    // Update cycle summary
    const CyclePerformanceSummary = require('./CyclePerformanceSummary.model');
    await CyclePerformanceSummary.updateSummaryForCycle(doc.employee, doc.cycle);
  } catch (error) {
    console.error('Error updating summaries after review save:', error);
  }
});

// Post-remove middleware to update summaries
performanceReviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const MonthlyPerformanceSummary = require('./MonthlyPerformanceSummary.model');
      await MonthlyPerformanceSummary.updateSummaryForMonth(
        doc.employee,
        doc.cycle,
        doc.reviewYear,
        doc.reviewMonth
      );
      
      const CyclePerformanceSummary = require('./CyclePerformanceSummary.model');
      await CyclePerformanceSummary.updateSummaryForCycle(doc.employee, doc.cycle);
    } catch (error) {
      console.error('Error updating summaries after review delete:', error);
    }
  }
});

// Static methods
performanceReviewSchema.statics.PERFORMANCE_TAGS = PERFORMANCE_TAGS;
performanceReviewSchema.statics.getPerformanceTag = getPerformanceTag;
performanceReviewSchema.statics.calculateDefaultFinancials = calculateDefaultFinancials;

// Method to check if month has reached max reviews (2)
performanceReviewSchema.statics.canAddReviewForMonth = async function(employeeId, year, month) {
  const count = await this.countDocuments({
    employee: employeeId,
    reviewYear: year,
    reviewMonth: month
  });
  
  return count < 2;
};

module.exports =
  mongoose.models.PerformanceReview ||
  mongoose.model('PerformanceReview', performanceReviewSchema);
