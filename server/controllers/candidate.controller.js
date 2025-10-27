const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Candidate = require('../models/Candidate.model');
const User = require('../models/User.model');
const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const fs = require('fs');
// const User = require("../models/User.model");
const Offer = require("../models/Offer.model");
const path = require('path');

const { uploadBuffer } = require('../utils/cloudinary.utils');

// CREATE CANDIDATE
const createCandidate = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
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
    spouseNumber,
    password,
    role
  } = req.body;

  if (!firstName || !lastName || !email || !mobile || !password) {
    return res.status(400).json({ message: "firstName, lastName, email, mobile, and password are required" });
  }

  const emailNormalized = String(email).trim().toLowerCase();

  // Prevent duplicates
  const existingCandidate = await Candidate.findOne({ email: emailNormalized });
  if (existingCandidate) return res.status(409).json({ message: "Candidate already exists" });

  const existingUser = await User.findOne({ email: emailNormalized });
  if (existingUser) return res.status(409).json({ message: "User with this email already exists" });

  // Start a transaction for consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create candidate first
    const candidate = await Candidate.create([{
      firstName,
      lastName,
      email: emailNormalized,
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
      department,
      isMarried,
      spouseName,
      spouseNumber,
      status: status || 'applied',
      createdBy: req.user?._id
    }], { session });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create linked user
    const user = await User.create([{
      name: `${firstName} ${lastName}`,
      email: emailNormalized,
      password: hashedPassword,
      role: role || 'employee',
      candidateId: candidate[0]._id
    }], { session });

    // Link back userId in candidate
    candidate[0].userId = user[0]._id;
    await candidate[0].save({ session });

    await AuditLog.create([{
      actor: req.user?._id,
      action: "candidate_created_with_user",
      details: { candidateId: candidate[0]._id, userId: user[0]._id }
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const populatedCandidate = await Candidate.findById(candidate[0]._id)
      .populate("userId")
      .populate("documents");

    res.status(201).json({
      message: "Candidate and user created successfully",
      candidate: populatedCandidate,
      user: {
        id: user[0]._id,
        email: user[0].email,
        role: user[0].role,
        candidateId: user[0].candidateId
      }
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("createCandidate error:", err);
    res.status(500).json({ message: "Failed to create candidate", error: err.message });
  }
});

// Get logged-in candidate details
// const me = asyncHandler(async (req, res) => {
//   try {
//     const candidateId = req.user?.candidateId; // must come from auth middleware
//     console.log("DEBUGGED entered atleast and also ,candidateId->",candidateId)
//     if (!candidateId) {
//       return res.status(404).json({ status: 'error', message: 'Candidate not found for logged-in user' });
//     }

//     // Fetch candidate and populate user/documents if needed
//     const candidate = await Candidate.findById(candidateId)
//       .populate('userId', 'name email role')  // optional: populate user info
//       .populate('documents');

//     console.log("🧑 Logged-in candidate details:", candidate);

//     res.status(200).json({ status: 'success', data: candidate });
//   } catch (err) {
//     console.error("❌ Error fetching logged-in candidate:", err);
//     res.status(500).json({ status: 'error', message: err.message });
//   }
// });  
// OLD 

//NEW ME
const me = asyncHandler(async (req, res) => {
  try {
    const candidateId = req.user?.candidateId;
    console.log("📍 Entered /api/candidates/me → candidateId:", candidateId);

    if (!candidateId) {
      return res
        .status(404)
        .json({ status: "error", message: "Candidate not found for logged-in user" });
    }

    // ✅ Fetch Candidate, User, and Offer — no Company populate
    const candidate = await Candidate.findById(candidateId)
      .populate({
        path: "userId",
        model: "User",
        select: "name email role createdAt",
      })
      .populate({
        path: "lastOffer",
        model: "Offer",
        select: "designation ctc joiningDate status offerLetterUrl createdAt notes createdBy",
        populate: { path: "createdBy", select: "name email role" },
      })
      .populate("documents")
      .lean();

    if (!candidate) {
      return res.status(404).json({
        status: "error",
        message: "Candidate profile not found",
      });
    }

    const fullName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();
    const lastOfferStatus = candidate?.lastOffer?.status || "N/A";

    const profile = {
      ...candidate,
      fullName,
      summary: {
        emailVerified: candidate.emailVerified,
        mobileVerified: candidate.mobileVerified,
        aadhaarVerified: candidate.aadhaarVerified,
        offerStatus: lastOfferStatus,
        candidateStatus: candidate.status,
      },
    };

    console.log("✅ Candidate profile fetched successfully:", {
      id: candidate._id,
      name: fullName,
      offer: lastOfferStatus,
    });

    res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (err) {
    console.error("❌ Error in /api/candidates/me:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Internal server error",
    });
  }
});

// ======================================================
// UPDATE, DELETE, LIST remain same except small improve
// ======================================================

// UPDATE CANDIDATE
const updateCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const incoming = req.body || {};

  const candidate = await Candidate.findById(id);
  if (!candidate) return res.status(404).json({ message: "Candidate not found" });

  // normalize email/mobile
  if (incoming.email) incoming.email = String(incoming.email).trim().toLowerCase();
  if (incoming.mobile) incoming.mobile = String(incoming.mobile).trim();
  if (incoming.fatherMobile) incoming.fatherMobile = String(incoming.fatherMobile).trim();

  // unique check
  if (incoming.email && incoming.email !== candidate.email) {
    const exists = await Candidate.findOne({ email: incoming.email, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Another candidate with this email already exists" });
  }

  const allowed = [
    "firstName", "lastName", "email", "mobile", "fatherMobile", "AlternativeMobile",
    "BloodGroup", "DateOfJoining", "photoUrl", "Designation", "Salary",
    "NextIncreament", "NextIncreamentDate", "Gender", "MotherName", "fatherName",
    "dob", "address", "aadhaarNumber", "panNumber", "drivingLicenseNumber",
    "pfNumber", "esicNumber", "medicalPolicyNumber", "status", "department",
    "isMarried", "spouseName", "spouseNumber"
  ];

  const update = {};
  allowed.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(incoming, k)) {
      if ((k === "dob" || k === "DateOfJoining" || k === "NextIncreamentDate") && incoming[k]) {
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
      } else update[k] = incoming[k];
    }
  });

  if (Object.keys(update).length === 0) return res.json(candidate);

  const updated = await Candidate.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate("documents")
    .populate("userId");

  await AuditLog.create({
    actor: req.user?._id,
    action: "candidate_updated",
    details: { candidateId: id, changed: Object.keys(update) }
  });

  res.json(updated);
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

module.exports = { createCandidate, getCandidate, updateCandidate, deleteCandidate, listCandidates, uploadProfilePhoto ,me};
