const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Candidate = require('../models/Candidate.model');
const User = require('../models/User.model');
const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const fs = require('fs');
const path = require('path');

const { uploadBuffer } = require('../utils/cloudinary.utils');

// CREATE CANDIDATE
const createCandidate = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role = 'employee', // Default role is employee
    mobile,
    AlternativeMobile,
    BloodGroup,
    DateOfJoining,
    photoUrl,
    Designation,
    Salary,
    NextIncreament,
    NextIncreamentDate,
    Gender,
    MotherName,
    fatherName,
    fatherMobile,
    dob,
    address,
    aadhaarNumber,
    panNumber,
    drivingLicenseNumber,
    pfNumber,
    esicNumber,
    medicalPolicyNumber,
    status,
    department,
    isMarried,
    spouseName,
    spouseNumber
  } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !mobile || !password) {
    return res.status(400).json({ message: "firstName, lastName, email, mobile, and password are required" });
  }

  const emailNormalized = String(email).trim().toLowerCase();
  const mobileNormalized = String(mobile).trim();
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const fatherMobileNormalized = fatherMobile ? String(fatherMobile).trim() : undefined;

  // Prevent duplicates
  const existing = await Candidate.findOne({
    $or: [
      { email: emailNormalized },
      { mobile: mobileNormalized },
      fatherMobileNormalized ? { fatherMobile: fatherMobileNormalized } : {}
    ].filter(Boolean),
  });
  if (existing) return res.status(409).json({ message: "Candidate with this email, mobile, or fatherMobile already exists" });

  // Parse dates
  const dobValue = dob ? new Date(dob) : undefined;
  const dateOfJoiningValue = DateOfJoining ? new Date(DateOfJoining) : undefined;
  const nextIncrementDateValue = NextIncreamentDate ? new Date(NextIncreamentDate) : undefined;

  // Prepare address
  const candidateAddress = address
    ? {
        current: { ...address.current },
        permanent: { ...address.permanent },
        isPermanentSameAsCurrent: address.isPermanentSameAsCurrent || false,
        isPG: address.isPG || false,
        pgOwnerName: address.pgOwnerName,
        pgName: address.pgName,
        pgNumber: address.pgNumber
      }
    : undefined;

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create user first
    const user = await User.create([{
      name: `${firstName} ${lastName}`.trim(),
      email: emailNormalized,
      password: hashedPassword,
      role: role,
      // Add other user fields as needed
    }], { session });

    // Then create candidate
    const candidate = await Candidate.create([{
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: emailNormalized,
      password: hashedPassword,
      mobile: mobileNormalized,
      fatherMobile: fatherMobileNormalized,
      AlternativeMobile,
      BloodGroup,
      DateOfJoining: dateOfJoiningValue,
      photoUrl,
      Designation,
      Salary,
      NextIncreament,
      NextIncreamentDate: nextIncrementDateValue,
      Gender,
      MotherName,
      fatherName,
      dob: dobValue,
      address: candidateAddress,
      aadhaarNumber,
      panNumber,
      drivingLicenseNumber,
      pfNumber,
      esicNumber,
      medicalPolicyNumber,
      department,
      isMarried,
      spouseName,
      spouseNumber,
      status: status || 'applied',
      createdBy: req.user?._id,
      user: user[0]._id // Reference to the created user
    }], { session });

    // Create audit log
    await AuditLog.create([{
      actor: req.user?._id,
      action: "reception_created",
      details: { candidateId: candidate[0]._id }
    }], { session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(candidate[0]);
  } catch (error) {
    // If anything fails, abort the transaction
    await session.abortTransaction();
    session.endSession();
    
    // Handle duplicate key error (e.g., email already exists in users collection)
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Email already exists in the system" 
      });
    }
    
    console.error('Error creating candidate and user:', error);
    res.status(500).json({ 
      message: 'Error creating candidate', 
      error: error.message 
    });
  }
});

// UPDATE CANDIDATE
const updateCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const incoming = req.body || {};

  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const candidate = await Candidate.findById(id).session(session);
    if (!candidate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Check if we need to update user record
    let user = null;
    if (candidate.user) {
      user = await User.findById(candidate.user).session(session);
    } else if (incoming.email) {
      // If candidate doesn't have a user but has an email, try to find one
      user = await User.findOne({ email: candidate.email }).session(session);
      if (user) {
        // Link the found user to the candidate
        candidate.user = user._id;
        await candidate.save({ session });
      }
    }

    // Normalize email, mobile, fatherMobile
    if (incoming.email) incoming.email = String(incoming.email).trim().toLowerCase();
    if (incoming.mobile) incoming.mobile = String(incoming.mobile).trim();
    if (incoming.fatherMobile) incoming.fatherMobile = String(incoming.fatherMobile).trim();

    // Ensure uniqueness for candidate
    if (incoming.email && incoming.email !== (candidate.email || "").toLowerCase()) {
      const exists = await Candidate.findOne({ email: incoming.email, _id: { $ne: id } }).session(session);
      if (exists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ message: "Another candidate with this email already exists" });
      }
    }
    
    // Check if email is being changed and update user email if needed
    if (incoming.email && incoming.email !== candidate.email) {
      // Check if new email already exists in users collection
      const emailExists = await User.findOne({ email: incoming.email, _id: { $ne: user?._id } }).session(session);
      if (emailExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ message: "This email is already registered as a user" });
      }
    }

  const allowed = [
    "firstName",
    "lastName",
    "email",
    "mobile",
    "fatherMobile",
    "AlternativeMobile",
    "BloodGroup",
    "DateOfJoining",
    "photoUrl",
    "Designation",
    "Salary",
    "NextIncreament",
    "NextIncreamentDate",
    "Gender",
    "MotherName",
    "fatherName",
    "dob",
    "address",
    "aadhaarNumber",
    "panNumber",
    "drivingLicenseNumber",
    "pfNumber",
    "esicNumber",
    "medicalPolicyNumber",
    "status",
    "department",
    "isMarried",
    "spouseName",
    "spouseNumber",
    "role"  // Added role to allowed fields
  ];

  const update = {};
  const userUpdate = {};
  let needsUserUpdate = false;
  let passwordHash = null;

  // Handle password hashing if password is being updated
  if (incoming.password) {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(incoming.password, salt);
    update.password = passwordHash;
    userUpdate.password = passwordHash;
    needsUserUpdate = true;
  }

  // Process all allowed fields
  allowed.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(incoming, k)) {
      if (k === 'email' || k === 'role') {
        // These fields need to be updated in both candidate and user
        update[k] = incoming[k];
        userUpdate[k] = incoming[k];
        needsUserUpdate = true;
      } else if ((k === "dob" || k === "DateOfJoining" || k === "NextIncreamentDate") && incoming[k]) {
        const d = new Date(incoming[k]);
        update[k] = isNaN(d.getTime()) ? candidate[k] : d;
      } else if (k === "address" && incoming.address) {
        update.address = {
          current: { ...candidate.address?.current, ...incoming.address.current },
          permanent: { ...candidate.address?.permanent, ...incoming.address.permanent },
          isPermanentSameAsCurrent: incoming.address.isPermanentSameAsCurrent ?? candidate.address?.isPermanentSameAsCurrent,
          isPG: incoming.address.isPG ?? candidate.address?.isPG,
          pgOwnerName: incoming.address.pgOwnerName ?? candidate.address?.pgOwnerName,
          pgName: incoming.address.pgName ?? candidate.address?.pgName,
          pgNumber: incoming.address.pgNumber ?? candidate.address?.pgNumber
        };
      } else if (k === 'firstName' || k === 'lastName') {
        // Update name in candidate and also in user if it exists
        update[k] = incoming[k];
        if (user) {
          needsUserUpdate = true;
          if (k === 'firstName') userUpdate.name = incoming[k] + ' ' + (update.lastName || candidate.lastName || '');
          if (k === 'lastName') userUpdate.name = (update.firstName || candidate.firstName || '') + ' ' + incoming[k];
        }
      } else {
        update[k] = incoming[k];
      }
    }
  });

  if (Object.keys(update).length === 0 && !needsUserUpdate) {
    await session.abortTransaction();
    session.endSession();
    return res.json(candidate);
  }

  // Update candidate
  const updatedCandidate = await Candidate.findByIdAndUpdate(
    id, 
    { $set: update },
    { new: true, session }
  ).populate("documents");

  // Update corresponding user if needed
  if (needsUserUpdate && user) {
    // If email is being updated, make sure it doesn't conflict with existing users
    if (userUpdate.email) {
      const emailExists = await User.findOne({ 
        email: userUpdate.email, 
        _id: { $ne: user._id } 
      }).session(session);
      
      if (emailExists) {
        await session.abortTransaction();
        session.endSession();
        return res.status(409).json({ message: "This email is already registered as a user" });
      }
    }

    // Update user
    await User.findByIdAndUpdate(
      user._id,
      { $set: userUpdate },
      { new: true, session }
    );
  } else if (needsUserUpdate && !user && incoming.email) {
    // If no user exists but we have an email, create a new user
    const newUser = await User.create([{
      name: `${update.firstName || candidate.firstName} ${update.lastName || candidate.lastName}`.trim(),
      email: update.email || candidate.email,
      password: passwordHash || candidate.password,
      role: update.role || 'employee',
      // Add other default fields as needed
    }], { session });

    // Link the new user to the candidate
    updatedCandidate.user = newUser[0]._id;
    await updatedCandidate.save({ session });
  }

  // Create audit log
  await AuditLog.create([{
    actor: req.user?._id,
    action: "reception_updated",
    details: { 
      candidateId: id, 
      changed: [...Object.keys(update), ...(needsUserUpdate ? ['user'] : [])]
    }
  }], { session });

  // Commit the transaction
  await session.commitTransaction();
  session.endSession();

  res.json(updatedCandidate);
  } catch (error) {
    // If anything fails, abort the transaction
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('Error updating candidate:', error);
    res.status(500).json({ 
      message: 'Error updating candidate', 
      error: error.message 
    });
  }
});

// UPLOAD PROFILE PHOTO
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ message: "photo file required" });

  const candidate = await Candidate.findById(id);
  if (!candidate) return res.status(404).json({ message: "Candidate not found" });

  try {
    const result = await uploadBuffer(file.buffer, file.originalname, "profiles");
    const photoUrl = result.secure_url || result.url;

    const updated = await Candidate.findByIdAndUpdate(id, { $set: { photoUrl } }, { new: true }).populate("documents");

    await AuditLog.create({
      actor: req.user?._id,
      action: "profile_photo_uploaded",
      details: { candidateId: id, photoUrl }
    });

    res.json(updated);
  } catch (err) {
    console.error("uploadProfilePhoto error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// GET SINGLE CANDIDATE
const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).populate('documents');
  if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
  res.json(candidate);
});

// DELETE CANDIDATE
const deleteCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const candidate = await Candidate.findById(id).populate("documents");
  if (!candidate) return res.status(404).json({ message: "Candidate not found" });

  // Delete documents
  const docs = candidate.documents || [];
  try {
    await Promise.all(docs.map(async doc => {
      try {
        if (doc.fileUrl) {
          const possiblePath = path.isAbsolute(doc.fileUrl)
            ? doc.fileUrl
            : path.resolve(process.cwd(), doc.fileUrl);
          if (fs.existsSync(possiblePath)) fs.unlinkSync(possiblePath);
        }
      } catch (e) {
        console.warn("Failed to delete file for doc", doc._id, e.message);
      }
      await Document.findByIdAndDelete(doc._id);
    }));
  } catch (err) {
    console.warn("Error while deleting documents for candidate", id, err.message);
  }

  await Candidate.findByIdAndDelete(id);

  await AuditLog.create({
    actor: req.user?._id,
    action: "reception_deleted",
    details: { candidateId: id }
  });

  res.json({ message: "Candidate and associated documents deleted" });
});

// LIST CANDIDATES
const listCandidates = asyncHandler(async (req, res) => {
  const candidates = await Candidate.find().sort({ createdAt: -1 }).populate("documents");
  res.json(candidates);
});

module.exports = { createCandidate, getCandidate, updateCandidate, deleteCandidate, listCandidates, uploadProfilePhoto };
