// createCandidateForUsers.js
const mongoose = require('mongoose');

const mongoUri = "";

const User = require('../models/User.model');       // adjust path if needed
const Candidate = require('../models/Candidate.model');

async function main() {
  try {
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(' Connected to MongoDB');

    // Fetch all users without candidateId
    const users = await User.find({ candidateId: null }).exec();
    console.log(`ℹ️ Found ${users.length} users without candidateId`);

    for (const user of users) {
      console.log('🔎 Processing user:', { _id: user._id, name: user.name, role: user.role });

      // Check if candidate with this email already exists
      const existingCandidate = await Candidate.findOne({ email: user.email });
      if (existingCandidate) {
        console.log(`⚠️ Candidate with email ${user.email} already exists. Linking user to this candidate.`);
        user.candidateId = existingCandidate._id;

        // Skip role validation to avoid errors
        await user.save({ validateBeforeSave: false });
        continue;
      }

      // Create new candidate
      const candidatePayload = {
        firstName: user.name || 'Auto',
        lastName: '',
        email: user.email,
        mobile: '',
        Designation: user.role === 'superadmin' ? 'Admin' : 'Employee',
        DateOfJoining: new Date(),
        department: user.role === 'superadmin' ? 'Admin' : 'General',
        userId: user._id,
        status: 'accepted',
      };

      const candidate = new Candidate(candidatePayload);
      const savedCandidate = await candidate.save();
      console.log(' Created candidate with id:', savedCandidate._id.toString());

      // Update user to link candidate
      user.candidateId = savedCandidate._id;

      // Skip role validation to avoid existing invalid roles
      await user.save({ validateBeforeSave: false });

      console.log(`🔗 Linked user ${user._id} -> candidate ${savedCandidate._id}`);
    }

    console.log('🎉 Done! Users without candidateId now have candidates.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();
