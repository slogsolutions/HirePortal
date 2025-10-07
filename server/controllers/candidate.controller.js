const asyncHandler = require('express-async-handler');
const Candidate = require('../models/Candidate.model');
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
  if (!firstName || !lastName || !email || !mobile) {
    return res.status(400).json({ message: "firstName, lastName, email and mobile are required" });
  }

  const emailNormalized = String(email).trim().toLowerCase();
  const mobileNormalized = String(mobile).trim();
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

  const candidate = await Candidate.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: emailNormalized,
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
    createdBy: req.user?._id
  });

  await AuditLog.create({
    actor: req.user?._id,
    action: "reception_created",
    details: { candidateId: candidate._id }
  });

  res.status(201).json(candidate);
});

// UPDATE CANDIDATE
const updateCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const incoming = req.body || {};

  const candidate = await Candidate.findById(id);
  if (!candidate) return res.status(404).json({ message: "Candidate not found" });

  // Normalize email, mobile, fatherMobile
  if (incoming.email) incoming.email = String(incoming.email).trim().toLowerCase();
  if (incoming.mobile) incoming.mobile = String(incoming.mobile).trim();
  if (incoming.fatherMobile) incoming.fatherMobile = String(incoming.fatherMobile).trim();

  // Ensure uniqueness
  if (incoming.email && incoming.email !== (candidate.email || "").toLowerCase()) {
    const exists = await Candidate.findOne({ email: incoming.email, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Another candidate with this email already exists" });
  }
  if (incoming.mobile && incoming.mobile !== (candidate.mobile || "").toString()) {
    const exists = await Candidate.findOne({ mobile: incoming.mobile, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Another candidate with this mobile already exists" });
  }
  if (incoming.fatherMobile && incoming.fatherMobile !== (candidate.fatherMobile || "").toString()) {
    const exists = await Candidate.findOne({ fatherMobile: incoming.fatherMobile, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Another candidate with this fatherMobile already exists" });
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
    "spouseNumber"
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
      } else {
        update[k] = incoming[k];
      }
    }
  });

  if (Object.keys(update).length === 0) return res.json(candidate);

  const updated = await Candidate.findByIdAndUpdate(id, { $set: update }, { new: true }).populate("documents");

  await AuditLog.create({
    actor: req.user?._id,
    action: "reception_updated",
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

module.exports = { createCandidate, getCandidate, updateCandidate, deleteCandidate, listCandidates, uploadProfilePhoto };
