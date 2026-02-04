const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PerformanceCycle = require('../models/PerformanceCycle.model');
const PerformanceReview = require('../models/PerformanceReview.model');
const MonthlyPerformanceSummary = require('../models/MonthlyPerformanceSummary.model');
const CyclePerformanceSummary = require('../models/CyclePerformanceSummary.model');
const Candidate = require('../models/Candidate.model');
const User = require('../models/User.model');

async function verifyMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB\n');
    
    // Check cycles
    console.log('📅 Performance Cycles:');
    const cycles = await PerformanceCycle.find().sort({ cycleNumber: 1 });
    cycles.forEach(c => {
      console.log(`   Cycle ${c.cycleNumber}: ${c.startDate.toLocaleDateString()} - ${c.endDate.toLocaleDateString()} (${c.status})`);
    });
    console.log();
    
    // Check reviews
    console.log('📝 Performance Reviews:');
    const reviews = await PerformanceReview.find()
      .populate('employee', 'firstName lastName email')
      .populate('cycle', 'cycleNumber')
      .sort({ reviewForMonth: 1 })
      .limit(10);
    
    console.log(`   Total reviews: ${await PerformanceReview.countDocuments()}`);
    console.log(`   Sample reviews:`);
    reviews.forEach((r, idx) => {
      const name = r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : 'Unknown';
      const reviewFor = r.reviewForMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      console.log(`   ${idx + 1}. ${name} - ${reviewFor} - ${r.performanceScore}★ (${r.performanceTag}) - ₹${r.incentiveAmount} incentive, ₹${r.penaltyAmount} penalty`);
    });
    console.log();
    
    // Check monthly summaries
    console.log('📊 Monthly Summaries:');
    const monthlySummaries = await MonthlyPerformanceSummary.find()
      .populate('employee', 'firstName lastName')
      .sort({ year: 1, month: 1 })
      .limit(5);
    
    console.log(`   Total monthly summaries: ${await MonthlyPerformanceSummary.countDocuments()}`);
    console.log(`   Sample summaries:`);
    monthlySummaries.forEach((s, idx) => {
      const name = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : 'Unknown';
      const monthStr = `${s.year}-${String(s.month).padStart(2, '0')}`;
      console.log(`   ${idx + 1}. ${name} - ${monthStr} - Avg: ${s.averageScore.toFixed(1)}★ (ceiling: ${s.ceilingScore}★) - Reviews: ${s.reviewCount} - Net: ₹${s.netAmount}`);
    });
    console.log();
    
    // Check cycle summaries
    console.log('📈 Cycle Summaries:');
    const cycleSummaries = await CyclePerformanceSummary.find()
      .populate('employee', 'firstName lastName')
      .populate('cycle', 'cycleNumber')
      .sort({ 'cycle.cycleNumber': 1 })
      .limit(5);
    
    console.log(`   Total cycle summaries: ${await CyclePerformanceSummary.countDocuments()}`);
    console.log(`   Sample summaries:`);
    cycleSummaries.forEach((s, idx) => {
      const name = s.employee ? `${s.employee.firstName} ${s.employee.lastName}` : 'Unknown';
      const cycleNum = s.cycle ? s.cycle.cycleNumber : 'N/A';
      console.log(`   ${idx + 1}. ${name} - Cycle ${cycleNum} - Avg: ${s.averageScore.toFixed(1)}★ - Total Incentive: ₹${s.totalIncentive} - Total Penalty: ₹${s.totalPenalty} - Net: ₹${s.netAmount}`);
    });
    console.log();
    
    // Check for warnings
    console.log('⚠️  Notice Period Warnings:');
    const warnings = await MonthlyPerformanceSummary.find({ hasNoticePeriodWarning: true })
      .populate('employee', 'firstName lastName email');
    
    if (warnings.length > 0) {
      console.log(`   🚨 Found ${warnings.length} employees with warnings:`);
      warnings.forEach(w => {
        const name = w.employee ? `${w.employee.firstName} ${w.employee.lastName}` : 'Unknown';
        console.log(`      - ${name} (${w.year}-${String(w.month).padStart(2, '0')})`);
      });
    } else {
      console.log(`   ✅ No notice period warnings`);
    }
    console.log();
    
    console.log('✅ Verification complete!\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyMigration();
