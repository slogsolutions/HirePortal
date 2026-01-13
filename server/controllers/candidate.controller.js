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

// function parseEmpCode(code) {
//   if (!code || typeof code !== 'string') return null;
//   const m = code.match(/^([A-Za-z]*)(\d+)$/);
//   if (!m) return null;
//   const prefix = m[1] || '';
//   const numStr = m[2];
//   const number = parseInt(numStr, 10);
//   const padding = numStr.length;
//   return { prefix, number, padding };
// }

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


// -----------------NEW UPDATE CANDIDATE WITH EMAIL UPDATE IN BOTH USER AND CANDIDATE 
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

  // unique check on email (candidate collection)
  if (incoming.email && incoming.email !== candidate.email) {
    const exists = await Candidate.findOne({ email: incoming.email, _id: { $ne: id } });
    if (exists) return res.status(409).json({ message: "Another candidate with this email already exists" });
  }

  // EMP CODE logic (unchanged)
  if (Object.prototype.hasOwnProperty.call(incoming, 'empCode')) {
    const newCode = incoming.empCode;
    if (!newCode) {
      candidate.empCode = undefined;
    } else if (String(candidate.empCode || '') !== String(newCode)) {
      const conflict = await Candidate.findOne({ empCode: newCode, _id: { $ne: id } });
      if (conflict) return res.status(409).json({ message: "empCode already assigned to another candidate" });

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

      incoming.empCode = newCode;
    } else {
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

  // ---------- Helper: robust user lookup ----------
  const findLinkedUser = async () => {
    // 1) try candidate.userId if present
    if (candidate.userId) {
      const u = await User.findById(candidate.userId);
      if (u) return u;
    }

    // 2) try user with candidateId field (if you store candidateId on User)
    const byCandidateId = await User.findOne({ candidateId: candidate._id });
    if (byCandidateId) return byCandidateId;

    // 3) try by candidate's current email (old email)
    if (candidate.email) {
      const byOldEmail = await User.findOne({ email: candidate.email });
      if (byOldEmail) return byOldEmail;
    }

    // 4) fallback: maybe a user already exists with the incoming email (rare) — return that
    if (incoming.email) {
      const byIncoming = await User.findOne({ email: incoming.email });
      if (byIncoming) return byIncoming;
    }

    return null;
  };
  // ---------- end helper ----------

  // --- NEW/UPDATED: sync email to linked User if incoming.email differs ---
  if (incoming.email && incoming.email !== candidate.email) {
    try {
      const userToUpdate = await findLinkedUser();

      if (userToUpdate) {
        // ensure no other user uses the incoming email
        const conflictUser = await User.findOne({ email: incoming.email, _id: { $ne: userToUpdate._id } });
        if (conflictUser) {
          return res.status(409).json({ message: "Another user already uses this email" });
        }

        // update User email atomically
        await User.findByIdAndUpdate(userToUpdate._id, { $set: { email: incoming.email } }, { new: true });

        await AuditLog.create({
          actor: req.user?._id,
          action: "user_email_synced_from_candidate",
          details: { candidateId: id, userId: userToUpdate._id, newEmail: incoming.email }
        });

        // ensure candidate.userId is linked
        if (!candidate.userId) {
          candidate.userId = userToUpdate._id;
          await candidate.save();
        }
      } else {
        // No linked user found — do not auto-create by default (safer).
        // If you want auto-create behavior, create user here and link candidate.userId.
      }
    } catch (err) {
      console.error("Error syncing user email for candidate", id, err);
      return res.status(500).json({ message: "Failed to sync user email", error: err.message });
    }
  }

  // If incoming contains a password, handle it separately (update linked User)
  if (incoming.password) {
    try {
      let userToUpdate = await findLinkedUser();

      // If still not found, try to find by candidate.email or incoming.email explicitly
      if (!userToUpdate) {
        userToUpdate = await User.findOne({ $or: [{ email: candidate.email }, { email: incoming.email }] });
      }

      const hashed = await bcrypt.hash(incoming.password, 10);

      if (userToUpdate) {
        await User.findByIdAndUpdate(userToUpdate._id, { $set: { password: hashed } });

        await AuditLog.create({
          actor: req.user?._id,
          action: "password_changed",
          details: { candidateId: id, userId: userToUpdate._id }
        });
      } else {
        // Create a new user and link to candidate
        const newUser = await User.create({
          name: `${incoming.firstName || candidate.firstName} ${incoming.lastName || candidate.lastName}`.trim(),
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


/**
 * Parse empCode like "S20824" -> { prefix: "S", number: 20824, padding: 5 }
 * Returns null if cannot parse.
 */


/**
 * Build empCode string from parts
 */
function buildEmpCode(prefix, number, padding) {
  const numStr = String(number).padStart(padding, '0');
  return `${prefix}${numStr}`;
}

/**
 * GET /api/candidates/empcodes
 * Returns:
 *   { data: [ ...rows ], count, nextEmpCodeInfo: { nextEmpCode, currentMaxNumeric, prefix, numericPadding } }
 *
 * Each row: { _id, empCode (string|null), firstName, lastName, email, mobile, Designation, department, createdAt }
 */
const listCandidatesWithEmpCodes = asyncHandler(async (req, res) => {
  // fetch minimal fields
  const candidates = await Candidate.find()
    .select('empCode firstName lastName email mobile Designation department createdAt')
    .lean();

  // prepare rows
  const rows = (Array.isArray(candidates) ? candidates : []).map((c) => ({
    _id: c._id,
    empCode: c.empCode || null,
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: c.email || '',
    mobile: c.mobile || '',
    Designation: c.Designation || '',
    department: c.department || '',
    createdAt: c.createdAt || null,
  }));

  // compute next empCode:
  // Strategy: parse all empCodes that match PREFIX + NUM pattern, pick the one with the largest numeric value.
  let best = null; // { prefix, number, padding }
  for (const r of rows) {
    if (!r.empCode) continue;
    const parsed = parseEmpCode(r.empCode);
    if (!parsed) continue;
    // If best is null, use this; otherwise choose the one with greater number.
    if (!best) {
      best = parsed;
    } else {
      // if different prefix, decide heuristic: prefer the one with largest numeric regardless of prefix
      if (parsed.number > best.number) best = parsed;
      // if equal number but larger padding, keep the larger padding to preserve formatting
      else if (parsed.number === best.number && parsed.padding > best.padding) best.padding = parsed.padding;
    }
  }

  let nextEmpCodeInfo = null;
  if (best) {
    const nextNumber = best.number + 1;
    const nextCode = buildEmpCode(best.prefix, nextNumber, best.padding);
    nextEmpCodeInfo = {
      nextEmpCode: nextCode,
      currentMaxNumeric: best.number,
      prefix: best.prefix,
      numericPadding: best.padding,
    };
  } else {
    // If none found, we can suggest a default sequence. You can adjust the default start.
    // e.g., default prefix "S" and start from 20700 -> next S20701 (change as you need)
    const defaultPrefix = 'S';
    const defaultStart = 20700;
    nextEmpCodeInfo = {
      nextEmpCode: buildEmpCode(defaultPrefix, defaultStart + 1, String(defaultStart).length),
      currentMaxNumeric: defaultStart,
      prefix: defaultPrefix,
      numericPadding: String(defaultStart).length,
    };
  }

  res.json({
    data: rows,
    count: rows.length,
    nextEmpCodeInfo,
  });
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
  getNextEmpCode,
   listCandidatesWithEmpCodes,
  // export helpers if you want to reuse elsewhere:
  parseEmpCode,
  buildEmpCode,
};
