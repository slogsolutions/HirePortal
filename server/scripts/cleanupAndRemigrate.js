const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PerformanceReview = require('../models/PerformanceReview.model');
const MonthlyPerformanceSummary = require('../models/MonthlyPerformanceSummary.model');
const CyclePerformanceSummary = require('../models/CyclePerformanceSummary.model');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🗑️  Deleting all migrated data...');
    
    const reviewCount = await PerformanceReview.countDocuments();
    const monthlyCount = await MonthlyPerformanceSummary.countDocuments();
    const cycleCount = await CyclePerformanceSummary.countDocuments();
    
    console.log(`   Reviews to delete: ${reviewCount}`);
    console.log(`   Monthly summaries to delete: ${monthlyCount}`);
    console.log(`   Cycle summaries to delete: ${cycleCount}`);
    
    await PerformanceReview.deleteMany({});
    await MonthlyPerformanceSummary.deleteMany({});
    await CyclePerformanceSummary.deleteMany({});
    
    console.log('   ✅ All migrated data deleted\n');
    
    await mongoose.connection.close();
    console.log('✅ Cleanup complete! Now run: node server/scripts/migratePerformanceToNewSystem.js\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
