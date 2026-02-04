const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PerformanceReview = require('../models/PerformanceReview.model');

async function checkReviews() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URL);
    
    const reviews = await PerformanceReview.find()
      .select('reviewForMonth performanceScore createdAt')
      .sort({ createdAt: 1 });
    
    console.log(`Total reviews: ${reviews.length}\n`);
    console.log('First 15 reviews:');
    reviews.slice(0, 15).forEach((r, i) => {
      const reviewFor = r.reviewForMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const created = r.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      console.log(`${i+1}. ReviewFor: ${reviewFor} | Score: ${r.performanceScore}★ | Created: ${created}`);
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReviews();
