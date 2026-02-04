/**
 * Migration Script: Old Performance System → New Cycle-Based System
 * 
 * This script migrates data from the old EmployeePerformance model
 * to the new PerformanceReview, MonthlyPerformanceSummary, and 
 * CyclePerformanceSummary models.
 * 
 * Run with: node server/scripts/migratePerformanceToNewSystem.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import models
const PerformanceCycle = require('../models/PerformanceCycle.model');
const PerformanceReview = require('../models/PerformanceReview.model');
const MonthlyPerformanceSummary = require('../models/MonthlyPerformanceSummary.model');
const CyclePerformanceSummary = require('../models/CyclePerformanceSummary.model');

// Old model schema (for reference)
const oldPerformanceSchema = new mongoose.Schema({
  employee: mongoose.Schema.Types.ObjectId,
  reviewer: mongoose.Schema.Types.ObjectId,
  period: String,
  performanceScore: Number,
  feedback: String,
  nextReview: Date,
}, { timestamps: true });

const OldEmployeePerformance = mongoose.models.EmployeePerformance || 
  mongoose.model('EmployeePerformance', oldPerformanceSchema);

async function migratePerformanceData() {
  console.log('\n🚀 Starting Performance System Migration...\n');
  
  try {
    // Step 1: Get all old performance records
    console.log('📊 Step 1: Fetching old performance records...');
    const allOldRecords = await OldEmployeePerformance.find({}).lean();
    console.log(`   Found ${allOldRecords.length} total old performance records`);
    
    // Filter: Only migrate records with period = "January 2026"
    const oldRecords = allOldRecords.filter(record => {
      if (!record.period) return false;
      
      const normalized = record.period.toLowerCase().trim();
      // Only accept "January 2026" or "january 2026" or similar
      return normalized.includes('january') && normalized.includes('2026');
    });
    
    console.log(`   Filtered to ${oldRecords.length} records (January 2026 only)`);
    console.log(`   Skipping ${allOldRecords.length - oldRecords.length} records (not January 2026)\n`);
    
    if (oldRecords.length === 0) {
      console.log('✅ No records to migrate from January 2026 onwards.\n');
      return;
    }
    
    // Step 2: Create cycles for all historical dates
    console.log('📅 Step 2: Creating performance cycles...');
    const cycleMap = new Map(); // key: "YYYY-H" (e.g., "2025-1"), value: cycle
    
    for (const record of oldRecords) {
      const date = record.createdAt || new Date();
      const year = date.getFullYear();
      const half = date.getMonth() < 6 ? 1 : 2;
      const key = `${year}-${half}`;
      
      if (!cycleMap.has(key)) {
        try {
          const cycle = await PerformanceCycle.getCycleForDate(date);
          cycleMap.set(key, cycle);
          console.log(`   ✓ Created/found cycle: ${year} H${half} (${cycle.cycleNumber})`);
        } catch (error) {
          console.error(`   ✗ Error creating cycle for ${key}:`, error.message);
        }
      }
    }
    console.log(`   Total cycles: ${cycleMap.size}\n`);
    
    // Step 3: Migrate each old record to new PerformanceReview
    console.log('🔄 Step 3: Migrating performance records...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const oldRecord of oldRecords) {
      try {
        // Use period field to determine reviewForMonth (not createdAt!)
        // All records should have period = "January 2026"
        const reviewForMonth = new Date(2026, 0, 1); // January 1, 2026
        const reviewDate = oldRecord.createdAt || new Date();
        
        // Get cycle for January 2026
        const year = 2026;
        const half = 1; // January is in first half
        const cycle = cycleMap.get(`${year}-${half}`);
        
        if (!cycle) {
          console.log(`   ⚠️  Skipping record ${oldRecord._id}: No cycle found`);
          skipCount++;
          continue;
        }
        
        // Check if already migrated (avoid duplicates)
        const existing = await PerformanceReview.findOne({
          employee: oldRecord.employee,
          reviewer: oldRecord.reviewer,
          reviewForMonth: reviewForMonth,
          performanceScore: oldRecord.performanceScore
        });
        
        if (existing) {
          console.log(`   ⏭️  Skipping record ${oldRecord._id}: Already migrated`);
          skipCount++;
          continue;
        }
        
        // Create new PerformanceReview
        const newReview = await PerformanceReview.create({
          employee: oldRecord.employee,
          reviewer: oldRecord.reviewer,
          cycle: cycle._id,
          reviewDate: reviewDate,
          reviewForMonth: reviewForMonth,
          performanceScore: oldRecord.performanceScore,
          feedback: oldRecord.feedback || 'Migrated from old system',
          // Financial fields will be auto-calculated by pre-save middleware
        });
        
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`   ✓ Migrated ${successCount} records...`);
        }
        
      } catch (error) {
        console.error(`   ✗ Error migrating record ${oldRecord._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${successCount} records`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipCount} records`);
    console.log(`   ❌ Errors: ${errorCount} records`);
    console.log(`   📊 Total processed: ${oldRecords.length} records\n`);
    
    // Step 4: Verify summaries were created
    console.log('🔍 Step 4: Verifying summaries...');
    const monthlySummaries = await MonthlyPerformanceSummary.countDocuments();
    const cycleSummaries = await CyclePerformanceSummary.countDocuments();
    console.log(`   Monthly summaries created: ${monthlySummaries}`);
    console.log(`   Cycle summaries created: ${cycleSummaries}\n`);
    
    // Step 5: Show warnings
    console.log('⚠️  Step 5: Checking for notice period warnings...');
    const warnings = await MonthlyPerformanceSummary.find({ hasNoticePeriodWarning: true })
      .populate('employee', 'firstName lastName email');
    
    if (warnings.length > 0) {
      console.log(`   🚨 Found ${warnings.length} employees with notice period warnings:`);
      warnings.forEach(w => {
        const name = w.employee ? `${w.employee.firstName} ${w.employee.lastName}` : 'Unknown';
        console.log(`      - ${name} (${w.year}-${String(w.month).padStart(2, '0')})`);
      });
    } else {
      console.log(`   ✅ No notice period warnings found`);
    }
    
    console.log('\n🎉 Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Test the new API endpoints');
    console.log('   2. Update frontend to use new data structure');
    console.log('   3. Verify all data is correct');
    console.log('   4. Backup old EmployeePerformance collection');
    console.log('   5. Remove old model after confirmation\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Parse reviewForMonth from old period string
 * Examples: "January 2026", "Dec", "2025-Q1", "Jan-Jun 2025", "December 2024"
 */
function parseReviewForMonth(periodString, fallbackDate) {
  if (!periodString) {
    // Use fallback date (createdAt)
    return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
  }
  
  const normalized = periodString.toLowerCase().trim();
  
  // Try to extract year
  const yearMatch = normalized.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : fallbackDate.getFullYear();
  
  // Month mapping
  const monthMap = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };
  
  // Check for month names
  for (const [monthName, monthIndex] of Object.entries(monthMap)) {
    if (normalized.includes(monthName)) {
      return new Date(year, monthIndex, 1);
    }
  }
  
  // Check for quarters
  if (normalized.includes('q1')) return new Date(year, 0, 1); // Jan
  if (normalized.includes('q2')) return new Date(year, 3, 1); // Apr
  if (normalized.includes('q3')) return new Date(year, 6, 1); // Jul
  if (normalized.includes('q4')) return new Date(year, 9, 1); // Oct
  
  // Default to fallback date's month
  return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1);
}

// Run migration
(async () => {
  try {
    await connectDB();
    await migratePerformanceData();
    console.log('✅ All done! Closing connection...\n');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
})();
