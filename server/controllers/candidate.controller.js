// controllers/candidate.controller.js
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Candidate = require('../models/Candidate.model');
const User = require('../models/User.model');
const Document = require('../models/Document.model');
const AuditLog = require('../models/AuditLog.model');
const fs = require('fs');
const Offer = require('../models/Offer.model');
const path = require('path');

const { uploadBuffer } = require('../utils/cloudinary.utils');

/**
 * Helper: parse empCode into { prefix, numeric, raw }
 * - Accepts formats like "S20700", "EMP00123", "20824" (prefix may be empty)
 * - Returns numeric as Number (or null if no numeric suffix found)
 */
function parseEmpCode(code) {
  if (!code || typeof code !== 'string') return { raw: code, prefix: '', numeric: null, numericStr: '' };
  const m = code.match(/^([A-Za-z]*)(\d+)$/);
  if (!m) {
    // no trailing digits - treat entire string as prefix, numeric null
    return { raw: code, prefix: code, numeric: null, numericStr: '' };
  }
  const prefix = m[1] || '';
  const numericStr = m[2] || '';
  const numeric = numericStr ? parseInt(numericStr, 10) : null;
  return { raw: code, prefix, numeric, numericStr };
}

/**
 * Helper: find current max numeric suffix across all empCodes and propose next.
 * - Returns { nextEmpCode, currentMaxNumeric, prefix, numericPadding }
 * - Uses prefix from the empCode with the max numeric (if found). If none exist, defaults to prefix 'S'.
 * - numericPadding: preserves digit length if possible (uses padding of the chosen max numeric string),
 *   otherwise 0 (no padding)
 */
// Helper: find current max numeric suffix across all empCodes and propose next.
// - Returns { nextEmpCode, currentMaxNumeric, prefix, numericPadding }
// - Behavior:
//    - If there are existing empCodes, uses the largest numeric and its prefix/padding.
//    - If no existing empCodes:
//         - if process.env.EMP_CODE_START is set (and numeric) -> start from that number
//         - otherwise start from 1
//    - numericPadding chosen as max(existingPadding, digits(startFrom), defaultPadding)
async function computeNextEmpCode() {
  // fetch all empCodes that are non-empty
  const docs = await Candidate.find({ empCode: { $exists: true, $ne: null, $ne: '' } }).select('empCode').lean();

  let currentMax = -Infinity;
  let chosenPrefix = 'S';
  let paddingFromExisting = 0;

  for (const d of docs) {
    const parsed = parseEmpCode(String(d.empCode || ''));
    if (parsed.numeric !== null && !isNaN(parsed.numeric)) {
      if (parsed.numeric > currentMax) {
        currentMax = parsed.numeric;
        chosenPrefix = parsed.prefix || chosenPrefix;
        paddingFromExisting = parsed.numericStr ? parsed.numericStr.length : paddingFromExisting;
      }
    }
  }

  // parse env start
  const envStartRaw = (process.env.EMP_CODE_START || '').trim();
  const envStartNum = envStartRaw ? parseInt(envStartRaw, 10) : NaN;
  const startFrom = !isNaN(envStartNum) && envStartNum > 0 ? envStartNum : 1;

  // default padding (if nothing else) - choose sensible: 3 (S001) or you can change to 5
  const defaultPadding = 3;

  if (currentMax === -Infinity) {
    // no existing numeric empCodes
    const nextNum = startFrom;
    // pick padding: if env provided use its digit count, otherwise use defaultPadding
    const padding = (!isNaN(envStartNum) ? String(startFrom).length : defaultPadding);
    const nextNumericStr = String(nextNum).padStart(padding, '0');

    return {
      nextEmpCode: `${chosenPrefix}${nextNumericStr}`,
      currentMaxNumeric: nextNum - 1, // so callers see the "previous" numeric
      prefix: chosenPrefix,
      numericPadding: padding
    };
  }

  // there are existing numeric empCodes: continue sequence from currentMax
  const nextNumeric = currentMax + 1;

  // determine padding: preserve existing padding if present, but ensure it's big enough for envStart if envStart is larger
  const envDigits = !isNaN(envStartNum) ? String(startFrom).length : 0;
  const padding = Math.max(paddingFromExisting || 0, envDigits, defaultPadding);
  const nextNumericStr = String(nextNumeric).padStart(padding, '0');

  return {
    nextEmpCode: `${chosenPrefix}${nextNumericStr}`,
    currentMaxNumeric: currentMax,
    prefix: chosenPrefix,
    numericPadding: padding
  };
}


// ------------------- CREATE CANDIDATE -------------------
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
    password, // optional now
    role,
    empCode: providedEmpCode,
    confirmEmpCodeChange // optional boolean
  } = req.body;

  if (!firstName || !lastName || !email || !mobile) {
    return res.status(400).json({ message: "firstName, lastName, email and mobile are required" });
  }

  const emailNormalized = String(email).trim().toLowerCase();

  // Prevent duplicates
  const existingCandidate = await Candidate.findOne({ email: emailNormalized });
  if (existingCandidate) return res.status(409).json({ message: "Candidate already exists" });

  const existingUser = await User.findOne({ email: emailNormalized });
  if (existingUser) return res.status(409).json({ message: "User with this email already exists" });

  // EMP CODE handling
  let finalEmpCode = undefined;
  if (providedEmpCode) {
    // uniqueness check
    const exists = await Candidate.findOne({ empCode: providedEmpCode });
    if (exists) return res.status(409).json({ message: "empCode already assigned to another candidate" });

    // check sequence: compute next expected
    const seq = await computeNextEmpCode();
    const providedParsed = parseEmpCode(String(providedEmpCode));
    const providedNumeric = providedParsed.numeric;

    // If provided numeric exists and is less than or equal to current max, it's okay (user supplied older code)
    // If provided numeric is greater than next expected, require confirmation (warn)
    if (providedNumeric !== null && providedNumeric > (seq.currentMaxNumeric + 1) && !confirmEmpCodeChange) {
      return res.status(400).json({
        message: "EmpCode deviates from automatic sequence",
        warning: {
          message: "Provided empCode numeric part is ahead of the next expected sequence.",
          currentMaxNumeric: seq.currentMaxNumeric,
          nextExpectedNumeric: seq.currentMaxNumeric + 1,
          providedNumeric
        }
      });
    }

    finalEmpCode = providedEmpCode;
  } else {
    // auto-generate
    const seq = await computeNextEmpCode();
    finalEmpCode = seq.nextEmpCode;
  }

  // Start a transaction for consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create candidate document with empCode (if we have finalEmpCode)
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
      createdBy: req.user?._id,
      empCode: finalEmpCode
    }], { session });

    // If password provided, create user with hashed password, otherwise create user without password
    let userPayload = {
      name: `${firstName} ${lastName}`,
      email: emailNormalized,
      role: role || 'employee',
      candidateId: candidate[0]._id
    };

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      userPayload.password = hashedPassword;
    }

    const user = await User.create([userPayload], { session });

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

// ------------------- GET NEXT EMP CODE -------------------
const getNextEmpCode = asyncHandler(async (req, res) => {
  try {
    const seq = await computeNextEmpCode();
    res.json({ nextEmpCode: seq.nextEmpCode, currentMaxNumeric: seq.currentMaxNumeric, prefix: seq.prefix, numericPadding: seq.numericPadding });
  } catch (err) {
    console.error("getNextEmpCode error:", err);
    res.status(500).json({ message: "Could not compute next empCode", error: err.message });
  }
});

// ------------------- me (unchanged) -------------------
const me = asyncHandler(async (req, res) => {
  try {
    const candidateId = req.user?.candidateId;
    if (!candidateId) {
      return res.status(404).json({ status: "error", message: "Candidate not found for logged-in user" });
    }

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
      return res.status(404).json({ status: "error", message: "Candidate profile not found" });
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

    res.status(200).json({ status: "success", data: profile });
  } catch (err) {
    console.error("❌ Error in /api/candidates/me:", err);
    res.status(500).json({ status: "error", message: err.message || "Internal server error" });
  }
});

// ------------------- UPDATE CANDIDATE -------------------
const updateCandidate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const incoming = req.body || {};
  const confirmEmpCodeChange = incoming.confirmEmpCodeChange;

  const candidate = await Candidate.findById(id);
  if (!candidate) return res.status(404).json({ message: "Candidate not found" });

  // normalize email/mobile
  if (incoming.email) incoming.email = String(incoming.email).trim().toLowerCase();
  if (incoming.mobile) incoming.mobile = String(incoming.mobile).trim();
  if (incoming.fatherMobile) incoming.fatherMobile = String(incoming.fatherMobile).trim();

  // unique check on email
  if (incoming.email && incoming.email !== candidate.email) {
    const exists = await Candidate.findOne({ email: incoming.email, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Another candidate with this email already exists" });
  }

  // EMP CODE update logic (if incoming contains empCode and it's different)
  if (Object.prototype.hasOwnProperty.call(incoming, 'empCode')) {
    const newCode = incoming.empCode;
    if (!newCode) {
      // user attempted to clear empCode: allow (if you want to forbid clearing, change this)
      candidate.empCode = undefined;
    } else if (String(candidate.empCode || '') !== String(newCode)) {
      // Check uniqueness
      const conflict = await Candidate.findOne({ empCode: newCode, _id: { $ne: id } });
      if (conflict) return res.status(409).json({ message: "empCode already assigned to another candidate" });

      // Sequence check: if new numeric is ahead of next expected and !confirmEmpCodeChange -> warn
      const seq = await computeNextEmpCode();
      const providedParsed = parseEmpCode(String(newCode));
      const providedNumeric = providedParsed.numeric;

      if (providedNumeric !== null && providedNumeric > (seq.currentMaxNumeric + 1) && !confirmEmpCodeChange) {
        return res.status(400).json({
          message: "EmpCode deviates from automatic sequence",
          warning: {
            message: "Provided empCode numeric part is ahead of the next expected sequence.",
            currentMaxNumeric: seq.currentMaxNumeric,
            nextExpectedNumeric: seq.currentMaxNumeric + 1,
            providedNumeric
          }
        });
      }

      // if passes checks (or confirmEmpCodeChange is true), set it
      incoming.empCode = newCode;
    } else {
      // no change to empCode
      delete incoming.empCode;
    }
  }

  const allowed = [
    "firstName", "lastName", "email", "mobile", "fatherMobile", "AlternativeMobile",
    "BloodGroup", "DateOfJoining", "photoUrl", "Designation", "Salary",
    "NextIncreament", "NextIncreamentDate", "Gender", "MotherName", "fatherName",
    "dob", "address", "aadhaarNumber", "panNumber", "drivingLicenseNumber",
    "pfNumber", "esicNumber", "medicalPolicyNumber", "status", "department",
    "isMarried", "spouseName", "spouseNumber", "empCode"
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

  // If incoming contains a password, handle it separately (update linked User)
  if (incoming.password) {
    try {
      // Prefer updating the linked userId
      let userToUpdate = null;
      if (candidate.userId) {
        userToUpdate = await User.findById(candidate.userId);
      }

      // If no user by userId, try finding user by candidate email
      if (!userToUpdate) {
        userToUpdate = await User.findOne({ email: candidate.email || incoming.email });
      }

      const hashed = await bcrypt.hash(incoming.password, 10);

      if (userToUpdate) {
        userToUpdate.password = hashed;
        await userToUpdate.save();

        await AuditLog.create({
          actor: req.user?._id,
          action: "password_changed",
          details: { candidateId: id, userId: userToUpdate._id }
        });
      } else {
        // No user exists; create one but link it.
        const newUser = await User.create({
          name: `${incoming.firstName || candidate.firstName} ${incoming.lastName || candidate.lastName}`,
          email: incoming.email || candidate.email,
          password: hashed,
          role: incoming.role || 'employee',
          candidateId: candidate._id
        });

        candidate.userId = newUser._id;
        await candidate.save();

        await AuditLog.create({
          actor: req.user?._id,
          action: "password_set_and_user_created",
          details: { candidateId: id, userId: newUser._id }
        });
      }
    } catch (err) {
      console.error("Error updating password for candidate", id, err);
      return res.status(500).json({ message: "Failed to update password", error: err.message });
    }
  }

  // If there are candidate fields to update, apply them
  let updatedCandidate = candidate;
  if (Object.keys(update).length > 0) {
    updatedCandidate = await Candidate.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("documents")
      .populate("userId");
    await AuditLog.create({
      actor: req.user?._id,
      action: "candidate_updated",
      details: { candidateId: id, changed: Object.keys(update) }
    });
  } else {
    // still populate if password-only change
    updatedCandidate = await Candidate.findById(id).populate("documents").populate("userId");
  }

  res.json(updatedCandidate);
});

// ------------------- UPLOAD PROFILE PHOTO -------------------
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

// ------------------- GET SINGLE CANDIDATE -------------------
const getCandidate = asyncHandler(async (req, res) => {
  const candidate = await Candidate.findById(req.params.id).populate('documents');
  if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
  res.json(candidate);
});

// ------------------- DELETE CANDIDATE -------------------
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

// ------------------- LIST CANDIDATES -------------------
const listCandidates = asyncHandler(async (req, res) => {
  const candidates = await Candidate.find().sort({ createdAt: -1 }).populate("documents");
  res.json(candidates);
});

// ------------------- CHANGE PASSWORD (unchanged) -------------------
const changePassword = asyncHandler(async (req, res) => {
  const { id } = req.params; // may be 'me' or a candidate id
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "currentPassword and newPassword are required" });
  }

  // resolve candidate id if caller used 'me'
  let candidateId = id;
  if (id === 'me' || !id) {
    candidateId = req.user?.candidateId;
  }

  if (!candidateId) {
    return res.status(404).json({ message: "Candidate id not found (provide :id or be authenticated)" });
  }

  const candidate = await Candidate.findById(candidateId);
  if (!candidate) return res.status(404).json({ message: "Candidate not found" });

  // find the linked user (prefer candidate.userId)
  let user = null;
  if (candidate.userId) {
    user = await User.findById(candidate.userId);
  } else {
    // fallback: try by candidate email
    if (candidate.email) {
      user = await User.findOne({ email: candidate.email });
    }
  }

  if (!user) {
    return res.status(404).json({ message: "Associated user account not found for this candidate" });
  }

  // If user's password isn't set (null/undefined), refuse: require admin flow or invite
  if (!user.password) {
    return res.status(400).json({
      message: "User has no password set. Use admin reset or invite flow to set an initial password."
    });
  }

  // verify current password
  const match = await bcrypt.compare(String(currentPassword), String(user.password));
  if (!match) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  // hash new password and save
  const hashed = await bcrypt.hash(String(newPassword), 10);
  user.password = hashed;
  await user.save();

  // audit log
  await AuditLog.create({
    actor: req.user?._id,
    action: "password_changed",
    details: { candidateId: candidate._id, userId: user._id }
  });

  return res.json({ message: "Password updated successfully" });
});

module.exports = {
  createCandidate,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  listCandidates,
  uploadProfilePhoto,
  me,
  changePassword,
  getNextEmpCode
};
