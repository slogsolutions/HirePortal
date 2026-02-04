const mongoose = require('mongoose');

const performanceCycleSchema = new mongoose.Schema(
  {
    cycleNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    half: {
      type: Number,
      enum: [1, 2], // 1 = Jan-Jun, 2 = Jul-Dec
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    closedAt: Date,
  },
  { timestamps: true }
);

// Indexes
performanceCycleSchema.index({ startDate: 1, endDate: 1 }, { unique: true });
performanceCycleSchema.index({ status: 1 });
performanceCycleSchema.index({ year: 1, half: 1 });

// Static method to get active cycle
performanceCycleSchema.statics.getActiveCycle = async function() {
  let activeCycle = await this.findOne({ status: 'active' });
  
  if (!activeCycle) {
    // Create first cycle if none exists
    const now = new Date();
    const isFirstHalf = now.getMonth() < 6;
    
    const lastCycle = await this.findOne().sort({ cycleNumber: -1 });
    const nextCycleNumber = lastCycle ? lastCycle.cycleNumber + 1 : 1;
    
    activeCycle = await this.create({
      cycleNumber: nextCycleNumber,
      startDate: new Date(now.getFullYear(), isFirstHalf ? 0 : 6, 1),
      endDate: new Date(now.getFullYear(), isFirstHalf ? 5 : 11, isFirstHalf ? 30 : 31),
      year: now.getFullYear(),
      half: isFirstHalf ? 1 : 2,
      status: 'active',
    });
  }
  
  return activeCycle;
};

// Static method to get cycle for a specific date
performanceCycleSchema.statics.getCycleForDate = async function(date) {
  const targetDate = new Date(date);
  
  let cycle = await this.findOne({
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
  });
  
  if (!cycle) {
    // Create cycle for this date
    const isFirstHalf = targetDate.getMonth() < 6;
    const year = targetDate.getFullYear();
    
    const lastCycle = await this.findOne().sort({ cycleNumber: -1 });
    const nextCycleNumber = lastCycle ? lastCycle.cycleNumber + 1 : 1;
    
    cycle = await this.create({
      cycleNumber: nextCycleNumber,
      startDate: new Date(year, isFirstHalf ? 0 : 6, 1),
      endDate: new Date(year, isFirstHalf ? 5 : 11, isFirstHalf ? 30 : 31),
      year: year,
      half: isFirstHalf ? 1 : 2,
      status: targetDate <= new Date() ? 'closed' : 'active',
    });
  }
  
  return cycle;
};

// Method to close cycle
performanceCycleSchema.methods.close = async function() {
  this.status = 'closed';
  this.closedAt = new Date();
  await this.save();
  
  // Freeze all cycle summaries
  const CyclePerformanceSummary = require('./CyclePerformanceSummary.model');
  await CyclePerformanceSummary.updateMany(
    { cycle: this._id },
    { isFrozen: true, frozenAt: new Date() }
  );
};

module.exports =
  mongoose.models.PerformanceCycle ||
  mongoose.model('PerformanceCycle', performanceCycleSchema);
