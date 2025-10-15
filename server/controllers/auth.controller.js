const asyncHandler = require('express-async-handler');
const Otp = require('../models/Otp.model');
const Candidate = require('../models/Candidate.model');
const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendSmsPlain } = require('../utils/sms.utils');

const OTP_EXP_MIN = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');

const sendOtp = asyncHandler(async (req, res) => {
  const { mobile, type } = req.body;
  if (!mobile) return res.status(400).json({ message: 'mobile required' });
  const code = (Math.floor(100000 + Math.random()*900000)).toString();
  const expiresAt = new Date(Date.now() + OTP_EXP_MIN*60*1000);
  await Otp.create({ mobile, code, type, expiresAt });
  await sendSmsPlain(mobile, `Your OTP is ${code}. It expires in ${OTP_EXP_MIN} minutes.`);
  res.json({ message: 'OTP sent' });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { mobile, code, type } = req.body;
  const otp = await Otp.findOne({ mobile, code, type, verified: false }).sort({ createdAt: -1 });
  if (!otp) return res.status(400).json({ message: 'Invalid OTP' });
  if (otp.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
  otp.verified = true;
  await otp.save();

  await Candidate.updateOne({ mobile }, { mobileVerified: true });
  await Candidate.updateOne({ fatherMobile: mobile }, { fatherMobileVerified: true });

  const token = jwt.sign({ mobile, type }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.json({ token, message: 'OTP verified' });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  // First try to find a user
  let account = await User.findOne({ email }).select('+password').lean();
  let isCandidate = false;
  
  // If not found as a user, try as a candidate
  if (!account) {
    account = await Candidate.findOne({ email }).select('+password').lean();
    isCandidate = true;
    if (!account) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  }
  
  // Check if account has a password
  if (!account.password) {
    return res.status(401).json({ message: 'Account not properly configured. Please contact support.' });
  }
  
  // Verify password
  const match = await bcrypt.compare(password, account.password);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // Create token with user type in payload
  const tokenPayload = { 
    id: account._id,
    type: isCandidate ? 'candidate' : 'user',
    ...(isCandidate ? {} : { role: account.role })
  };
  
  const token = jwt.sign(
    tokenPayload, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  // Prepare response based on account type
  const response = {
    token,
    user: {
      id: account._id,
      name: isCandidate ? `${account.firstName} ${account.lastName}` : account.name,
      email: account.email,
      type: isCandidate ? 'candidate' : 'user',
      ...(isCandidate ? {} : { role: account.role })
    }
  };
  
  res.json(response);
});

module.exports = { sendOtp, verifyOtp, login };
