const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkOldData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB\n');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Check for old performance data
    if (collectionNames.includes('employeeperformances')) {
      const count = await mongoose.connection.db.collection('employeeperformances').countDocuments();
      console.log(`📊 Old performance records found: ${count}\n`);
      
      if (count > 0) {
        const samples = await mongoose.connection.db.collection('employeeperformances')
          .find()
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray();
        
        console.log('📝 Sample old records (most recent):');
        samples.forEach((s, idx) => {
          console.log(`${idx + 1}. Period: "${s.period}" | Created: ${s.createdAt.toLocaleDateString()}`);
        });
      }
    } else {
      console.log('ℹ️  No old performance collection found');
    }
    
    // Check for new performance data
    if (collectionNames.includes('performancereviews')) {
      const count = await mongoose.connection.db.collection('performancereviews').countDocuments();
      console.log(`\n✨ New performance reviews: ${count}`);
      
      if (count > 0) {
        const samples = await mongoose.connection.db.collection('performancereviews')
          .find()
          .sort({ reviewForMonth: 1 })
          .limit(5)
          .toArray();
        
        console.log('\n📝 Sample new reviews:');
        samples.forEach((s, idx) => {
          const reviewFor = new Date(s.reviewForMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          console.log(`${idx + 1}. Review for: ${reviewFor} | Score: ${s.performanceScore}★ | Tag: ${s.performanceTag}`);
        });
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkOldData();
