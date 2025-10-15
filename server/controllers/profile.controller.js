const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const Candidate = require('../models/Candidate.model');
const AuditLog = require('../models/AuditLog.model');

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
const getMyProfile = asyncHandler(async (req, res) => {
  // Get user info without password
  const user = await User.findById(req.user.id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Check if user is a candidate
  const candidate = await Candidate.findOne({ email: user.email });
  
  // Prepare response with user and candidate data
  const response = {
    ...user.toObject(),
  };

  // If candidate data exists, include it in the response
  if (candidate) {
    response.candidate = candidate.toObject();
  }

  res.json(response);
});

// @desc    Update user password
// @route   PUT /api/profile/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide both current and new password' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const user = await User.findById(req.user.id).select('+password');
  
  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password
  user.password = hashedPassword;
  await user.save();

  // Log the password change
  await AuditLog.create({
    actor: user._id,
    action: 'password_changed',
    details: { userId: user._id }
  });

  res.json({ message: 'Password updated successfully' });
});

module.exports = {
  getMyProfile,
  updatePassword
};
