const PerformanceReview = require('../models/PerformanceReview.model');
const PerformanceCycle = require('../models/PerformanceCycle.model');
const MonthlyPerformanceSummary = require('../models/MonthlyPerformanceSummary.model');
const CyclePerformanceSummary = require('../models/CyclePerformanceSummary.model');
const Candidate = require('../models/Candidate.model');

//  Create new performance review
const createPerformance = async (req, res) => {
  try {
    const { id } = req.params; // candidate id
    const { 
      reviewForMonth,  // CRITICAL: Month being reviewed (selected by admin)
      performanceScore, 
      feedback,
      incentiveOverride,
      penaltyOverride,
      overrideReason
    } = req.body;

    // Validate candidate
    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    // Validate required fields
    if (!reviewForMonth) {
      return res.status(400).json({ message: 'reviewForMonth is required - select which month you are reviewing' });
    }
    if (!performanceScore || performanceScore < 1 || performanceScore > 5) {
      return res.status(400).json({ message: 'performanceScore must be between 1 and 5' });
    }
    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ message: 'feedback is required' });
    }

    // Get or create cycle for the review month
    const reviewForDate = new Date(reviewForMonth);
    const cycle = await PerformanceCycle.getCycleForDate(reviewForDate);

    // Check if month already has 2 reviews (max limit)
    const reviewYear = reviewForDate.getFullYear();
    const reviewMonth = reviewForDate.getMonth() + 1;
    
    const canAdd = await PerformanceReview.canAddReviewForMonth(id, reviewYear, reviewMonth);
    if (!canAdd) {
      return res.status(400).json({ 
        message: `Maximum 2 reviews per month reached for ${reviewForDate.toLocaleString('default', { month: 'long', year: 'numeric' })}` 
      });
    }

    // Create review
    const reviewData = {
      employee: id,
      reviewer: req.user._id,
      cycle: cycle._id,
      reviewForMonth: reviewForDate,
      performanceScore,
      feedback: feedback.trim(),
    };

    // Add overrides if provided
    if (incentiveOverride !== undefined && incentiveOverride !== null) {
      reviewData.incentiveOverride = incentiveOverride;
    }
    if (penaltyOverride !== undefined && penaltyOverride !== null) {
      reviewData.penaltyOverride = penaltyOverride;
    }
    if (overrideReason) {
      reviewData.overrideReason = overrideReason.trim();
    }

    const review = await PerformanceReview.create(reviewData);

    // Populate the response
    const populatedReview = await PerformanceReview.findById(review._id)
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('reviewer', 'name email')
      .populate('cycle', 'cycleNumber startDate endDate year half status');

    // Check if this created a notice period warning
    const monthlySummary = await MonthlyPerformanceSummary.findOne({
      employee: id,
      year: reviewYear,
      month: reviewMonth
    });

    const warningMessage = monthlySummary && monthlySummary.hasNoticePeriodWarning
      ? '⚠️ WARNING: Consecutive low performance detected - notice period may be initiated.'
      : null;

    res.status(201).json({
      success: true,
      data: populatedReview,
      message: warningMessage || 'Performance review created successfully',
      warning: warningMessage ? true : false
    });
  } catch (err) {
    console.error('createPerformance error:', err);
    res.status(500).json({ message: 'Failed to create performance review', error: err.message });
  }
};

//  Get all performance reviews with advanced filtering
const getAllPerformances = async (req, res) => {
  try {
    const { 
      employeeId, 
      cycleId,
      year,
      month,
      performanceTag,
      hasWarning,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (cycleId) filter.cycle = cycleId;
    if (year) filter.reviewYear = parseInt(year);
    if (month) filter.reviewMonth = parseInt(month);
    if (performanceTag) filter.performanceTag = performanceTag;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let reviews = await PerformanceReview.find(filter)
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('reviewer', 'name email')
      .populate('cycle', 'cycleNumber startDate endDate year half status')
      .sort({ reviewDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by warning if requested
    if (hasWarning === 'true') {
      const reviewIds = reviews.map(r => r._id);
      const monthlySummaries = await MonthlyPerformanceSummary.find({
        reviews: { $in: reviewIds },
        hasNoticePeriodWarning: true
      });
      
      const warningReviewIds = new Set();
      monthlySummaries.forEach(summary => {
        summary.reviews.forEach(rid => warningReviewIds.add(rid.toString()));
      });
      
      reviews = reviews.filter(r => warningReviewIds.has(r._id.toString()));
    }

    const total = await PerformanceReview.countDocuments(filter);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('getAllPerformances error:', err);
    res.status(500).json({ message: 'Failed to load performance reviews', error: err.message });
  }
};

//  Get performance review by ID
const getPerformanceById = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const review = await PerformanceReview.findById(performanceId)
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('reviewer', 'name email')
      .populate('cycle', 'cycleNumber startDate endDate year half status');

    if (!review) return res.status(404).json({ message: 'Performance review not found' });

    res.json({
      success: true,
      data: review
    });
  } catch (err) {
    console.error('getPerformanceById error:', err);
    res.status(500).json({ message: 'Failed to load performance review', error: err.message });
  }
};

//  Get performance for the logged-in user (/me)
const getMyPerformance = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. User not found in request.' });
    }

    // Get user with candidateId
    const User = require('../models/User.model');
    const user = await User.findById(userId).select('candidateId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.candidateId) {
      return res.status(404).json({ 
        message: 'No candidate profile linked to your account. Please contact HR.' 
      });
    }

    const { cycleId } = req.query;

    // Get active cycle if not specified
    const cycle = cycleId 
      ? await PerformanceCycle.findById(cycleId)
      : await PerformanceCycle.getActiveCycle();

    if (!cycle) {
      return res.status(404).json({ message: 'No performance cycle found' });
    }

    // Get all reviews for this employee in this cycle
    const reviews = await PerformanceReview.find({
      employee: user.candidateId,
      cycle: cycle._id
    })
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('reviewer', 'name email')
      .populate('cycle', 'cycleNumber startDate endDate year half status')
      .sort({ reviewDate: -1 });

    // Get monthly summaries for this cycle
    const monthlySummaries = await MonthlyPerformanceSummary.find({
      employee: user.candidateId,
      cycle: cycle._id
    }).sort({ cycleMonth: 1 });

    // Get cycle summary
    const cycleSummary = await CyclePerformanceSummary.findOne({
      employee: user.candidateId,
      cycle: cycle._id
    });

    // Get all available cycles for this employee
    const allCycles = await PerformanceCycle.find({}).sort({ startDate: -1 });

    res.json({
      success: true,
      data: {
        currentCycle: cycle,
        reviews: reviews || [],
        monthlySummaries: monthlySummaries || [],
        cycleSummary: cycleSummary || null,
        availableCycles: allCycles || []
      },
      count: reviews?.length || 0
    });
  } catch (err) {
    console.error('getMyPerformance error:', err);
    res.status(500).json({ message: 'Failed to load your performance records', error: err.message });
  }
};

//  Update performance review
const updatePerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const updateData = { ...req.body };

    // Don't allow changing employee or cycle
    delete updateData.employee;
    delete updateData.cycle;

    const updated = await PerformanceReview.findByIdAndUpdate(
      performanceId, 
      updateData, 
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('reviewer', 'name email')
      .populate('cycle', 'cycleNumber startDate endDate year half status');

    if (!updated) return res.status(404).json({ message: 'Performance review not found' });

    // Check if update created a warning
    const monthlySummary = await MonthlyPerformanceSummary.findOne({
      employee: updated.employee._id,
      year: updated.reviewYear,
      month: updated.reviewMonth
    });

    const warningMessage = monthlySummary && monthlySummary.hasNoticePeriodWarning
      ? '⚠️ WARNING: Consecutive low performance detected.'
      : null;

    res.json({
      success: true,
      data: updated,
      message: warningMessage || 'Performance review updated successfully',
      warning: warningMessage ? true : false
    });
  } catch (err) {
    console.error('updatePerformance error:', err);
    res.status(500).json({ message: 'Failed to update performance review', error: err.message });
  }
};

//  Delete performance review
const deletePerformance = async (req, res) => {
  try {
    const { performanceId } = req.params;
    const deleted = await PerformanceReview.findByIdAndDelete(performanceId);
    
    if (!deleted) return res.status(404).json({ message: 'Performance review not found' });

    res.json({ 
      success: true,
      message: 'Performance review deleted successfully' 
    });
  } catch (err) {
    console.error('deletePerformance error:', err);
    res.status(500).json({ message: 'Failed to delete performance review', error: err.message });
  }
};

//  Get enhanced leaderboard with cycle support
const getLeaderboard = async (req, res) => {
  try {
    const { limit = 10, cycleId } = req.query;
    
    // Get cycle (active if not specified)
    const cycle = cycleId 
      ? await PerformanceCycle.findById(cycleId)
      : await PerformanceCycle.getActiveCycle();

    if (!cycle) {
      return res.status(404).json({ message: 'No performance cycle found' });
    }

    // Get all cycle summaries for this cycle
    const cycleSummaries = await CyclePerformanceSummary.find({ cycle: cycle._id })
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .lean();

    // Format leaderboard
    const leaderboard = cycleSummaries
      .map(summary => ({
        employeeId: summary.employee._id,
        name: `${summary.employee.firstName || ''} ${summary.employee.lastName || ''}`.trim() || 'Unknown',
        designation: summary.employee.Designation || 'Employee',
        photoUrl: summary.employee.photoUrl || null,
        averageScore: summary.averageScore,
        ceilingAverageScore: summary.ceilingAverageScore,
        performanceTag: summary.finalPerformanceTag,
        totalReviews: summary.totalReviews,
        monthsWithReviews: summary.monthsWithReviews,
        totalIncentives: summary.totalIncentives,
        totalPenalties: summary.totalPenalties,
        netAmount: summary.netAmount,
        hasWarnings: summary.hadNoticePeriodWarning
      }))
      .filter(emp => emp.ceilingAverageScore > 0)
      .sort((a, b) => {
        // Sort by ceiling average first, then by net amount
        if (b.ceilingAverageScore !== a.ceilingAverageScore) {
          return b.ceilingAverageScore - a.ceilingAverageScore;
        }
        return b.netAmount - a.netAmount;
      })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
      cycle: {
        _id: cycle._id,
        cycleNumber: cycle.cycleNumber,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        year: cycle.year,
        half: cycle.half,
        status: cycle.status
      }
    });
  } catch (err) {
    console.error('getLeaderboard error:', err);
    res.status(500).json({ message: 'Failed to load leaderboard', error: err.message });
  }
};

//  Get all cycles
const getAllCycles = async (req, res) => {
  try {
    const cycles = await PerformanceCycle.find({}).sort({ startDate: -1 });
    
    res.json({
      success: true,
      data: cycles,
      count: cycles.length
    });
  } catch (err) {
    console.error('getAllCycles error:', err);
    res.status(500).json({ message: 'Failed to load cycles', error: err.message });
  }
};

//  Get active cycle
const getActiveCycle = async (req, res) => {
  try {
    const cycle = await PerformanceCycle.getActiveCycle();
    
    res.json({
      success: true,
      data: cycle
    });
  } catch (err) {
    console.error('getActiveCycle error:', err);
    res.status(500).json({ message: 'Failed to load active cycle', error: err.message });
  }
};

//  Close a cycle (admin only)
const closeCycle = async (req, res) => {
  try {
    const { cycleId } = req.params;
    
    const cycle = await PerformanceCycle.findById(cycleId);
    if (!cycle) {
      return res.status(404).json({ message: 'Cycle not found' });
    }
    
    if (cycle.status === 'closed') {
      return res.status(400).json({ message: 'Cycle is already closed' });
    }
    
    await cycle.close();
    
    res.json({
      success: true,
      message: 'Cycle closed successfully',
      data: cycle
    });
  } catch (err) {
    console.error('closeCycle error:', err);
    res.status(500).json({ message: 'Failed to close cycle', error: err.message });
  }
};

//  Get monthly summaries for an employee
const getMonthlySummaries = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { cycleId } = req.query;
    
    const filter = { employee: employeeId };
    if (cycleId) filter.cycle = cycleId;
    
    const summaries = await MonthlyPerformanceSummary.find(filter)
      .populate('cycle', 'cycleNumber startDate endDate year half status')
      .sort({ year: -1, month: -1 });
    
    res.json({
      success: true,
      data: summaries,
      count: summaries.length
    });
  } catch (err) {
    console.error('getMonthlySummaries error:', err);
    res.status(500).json({ message: 'Failed to load monthly summaries', error: err.message });
  }
};

//  Get cycle summary for an employee
const getCycleSummary = async (req, res) => {
  try {
    const { employeeId, cycleId } = req.params;
    
    const summary = await CyclePerformanceSummary.findOne({
      employee: employeeId,
      cycle: cycleId
    })
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('cycle', 'cycleNumber startDate endDate year half status');
    
    if (!summary) {
      return res.status(404).json({ message: 'Cycle summary not found' });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error('getCycleSummary error:', err);
    res.status(500).json({ message: 'Failed to load cycle summary', error: err.message });
  }
};

//  Get employees with notice period warnings
const getWarnings = async (req, res) => {
  try {
    const { cycleId } = req.query;
    
    // Get cycle (active if not specified)
    const cycle = cycleId 
      ? await PerformanceCycle.findById(cycleId)
      : await PerformanceCycle.getActiveCycle();

    if (!cycle) {
      return res.status(404).json({ message: 'No performance cycle found' });
    }

    // Find monthly summaries with warnings
    const warnings = await MonthlyPerformanceSummary.find({
      cycle: cycle._id,
      hasNoticePeriodWarning: true
    })
      .populate('employee', 'firstName lastName email Designation photoUrl')
      .populate('cycle', 'cycleNumber startDate endDate year half status')
      .sort({ year: -1, month: -1 });
    
    res.json({
      success: true,
      data: warnings,
      count: warnings.length,
      cycle: {
        _id: cycle._id,
        cycleNumber: cycle.cycleNumber,
        startDate: cycle.startDate,
        endDate: cycle.endDate
      }
    });
  } catch (err) {
    console.error('getWarnings error:', err);
    res.status(500).json({ message: 'Failed to load warnings', error: err.message });
  }
};

module.exports = {
  createPerformance,
  getAllPerformances,
  getPerformanceById,
  updatePerformance,
  deletePerformance,
  getMyPerformance,
  getLeaderboard,
  getAllCycles,
  getActiveCycle,
  closeCycle,
  getMonthlySummaries,
  getCycleSummary,
  getWarnings,
};
