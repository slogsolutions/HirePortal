const Leave = require("../models/Leaves.model");
const { markApprovedLeaveDays } = require("../utils/leave.util");
const User = require("../models/User.model");
// Create leave
const createLeave = async (req, res) => {
  try {
    console.log("entered createLeave");
    const { startDate, endDate, reason } = req.body;
    const appliedBy = req.user?.candidateId || req.user?._id; // fallback to user._id
    if (!appliedBy) {
      console.warn("No candidateId found on req.user");
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    console.log("🆕 Creating leave for candidate:", appliedBy);

    const leave = await Leave.create({ startDate, endDate, reason, appliedBy });
    console.log("✅ Leave created:", leave);

    const populatedLeave = await leave.populate(
      "appliedBy",
      "firstName lastName email"
    );
    return res.status(201).json({ status: "success", data: populatedLeave });
  } catch (err) {
    console.error("❌ Error creating leave:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Get single leave by id
const getLeaveById = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await Leave.findById(leaveId)
      .populate("appliedBy", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName email");

    console.log("📄 Fetched leave by ID:", leave);

    if (!leave) {
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });
    }

    // Authorization: if not admin and not owner, deny
    const requesterCandidateId = req.user?.candidateId || req.user?._id;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "reviewer";
    if (
      !isAdmin &&
      leave.appliedBy?.toString() !== requesterCandidateId?.toString()
    ) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    return res.status(200).json({ status: "success", data: leave });
  } catch (err) {
    console.error("❌ Error fetching leave by ID:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Get leaves
// Behavior:
// - If user is admin/reviewer: return all leaves (can filter with ?future=true or ?status=pending|approved|rejected)
// - Otherwise: return only leaves applied by this user
// Supports optional pagination: ?limit=50&skip=0
const getLeaves = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin" || req.user?.role === "reviewer";
    const filter = {};

    // If future filter requested
    if (req.query.future === "true") {
      filter.startDate = { $gte: new Date() };
    }

    // Optional status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // If not admin, restrict to current user only
    if (!isAdmin) {
      const appliedBy = req.user?.candidateId || req.user?._id;
      if (!appliedBy) {
        return res
          .status(401)
          .json({ status: "error", message: "Unauthorized" });
      }
      filter.appliedBy = appliedBy;
    } else {
      // admin: optional query param to only return all (default behavior). no change necessary
    }

    // Pagination options
    const limit = Math.min(100, parseInt(req.query.limit || "0", 10) || 0); // cap at 100
    const skip = parseInt(req.query.skip || "0", 10) || 0;

    let query = Leave.find(filter)
      .populate("appliedBy", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    if (limit > 0) query = query.limit(limit).skip(skip);

    const leaves = await query.exec();

    console.log("✅ Leaves fetched from DB:", {
      count: leaves.length,
      filter,
      limit,
      skip,
    });
    return res.status(200).json({ status: "success", data: leaves });
  } catch (err) {
    console.error("❌ Error fetching leaves:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Get only the authenticated user's leaves
const getMyLeaves = async (req, res) => {
  try {
    const appliedBy = req.user?.candidateId || req.user?._id;
    if (!appliedBy) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const filter = { appliedBy };

    if (req.query.future === "true") {
      filter.startDate = { $gte: new Date() };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const limit = Math.min(100, parseInt(req.query.limit || "0", 10) || 0);
    const skip = parseInt(req.query.skip || "0", 10) || 0;

    let query = Leave.find(filter)
      .populate("appliedBy", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    if (limit > 0) query = query.limit(limit).skip(skip);

    const leaves = await query.exec();

    console.log(` My leaves fetched for ${appliedBy}:`, leaves.length);
    return res.status(200).json({ status: "success", data: leaves });
  } catch (err) {
    console.error(" Error fetching my leaves:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Update leave
// const updateLeave = async (req, res) => {
//   try {
//     const leaveId = req.params.id;
//     const { status, comment, startDate, endDate, reason } = req.body;

//     // Build update object carefully to avoid overwriting fields unintentionally
//     const updateObj = { updatedAt: new Date() };

//     if (typeof startDate !== "undefined") updateObj.startDate = startDate;
//     if (typeof endDate !== "undefined") updateObj.endDate = endDate;
//     if (typeof reason !== "undefined") updateObj.reason = reason;
//     if (typeof comment !== "undefined") updateObj.comment = comment;

//     // If status provided, validate and set it; when approving/rejecting, set reviewedBy
//     if (typeof status !== "undefined") {
//       const allowed = ["pending", "approved", "rejected"];
//       if (!allowed.includes(status)) {
//         return res.status(400).json({ status: "error", message: "Invalid status value" });
//       }
//       updateObj.status = status;

//       // If changing to approved/rejected, set reviewedBy from req.user.candidateId (if present)
//       if (status === "approved" || status === "rejected") {
//         if (req.user && (req.user.candidateId || req.user._id)) {
//           updateObj.reviewedBy = req.user.candidateId || req.user._id;
//         } else {
//           console.warn(`Authenticated user ${req.user?._id} has no candidateId — reviewedBy not set automatically.`);
//         }
//       }
//     }

//     // Authorization: only appliedBy (owner) can edit their own pending leave, admins can edit any
//     const leave = await Leave.findById(leaveId);
//     if (!leave) {
//       return res.status(404).json({ status: "error", message: "Leave not found" });
//     }

//     const isAdmin = req.user?.role === 'admin' || req.user?.role === 'reviewer';
//     const requesterCandidateId = req.user?.candidateId || req.user?._id;

//     // If requester is not admin, only allow owner to edit and only when status is 'pending' (common policy)
//     if (!isAdmin) {
//       if (leave.appliedBy?.toString() !== requesterCandidateId?.toString()) {
//         return res.status(403).json({ status: "error", message: "Forbidden" });
//       }
//       // prevent non-admin from changing status to approved/rejected
//       if (typeof status !== "undefined" && status !== 'pending') {
//         return res.status(403).json({ status: "error", message: "Only admin/reviewer may change status" });
//       }
//     }

//     const updated = await Leave.findByIdAndUpdate(leaveId, updateObj, { new: true })
//       .populate("appliedBy", "firstName lastName email")
//       .populate("reviewedBy", "firstName lastName email");

//     console.log("✏️ Leave updated:", updated);
//     return res.status(200).json({ status: "success", data: updated });
//   } catch (err) {
//     console.error("❌ Error updating leave:", err);
//     return res.status(500).json({ status: "error", message: err.message });
//   }
// };
const updateLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { status, comment, startDate, endDate, reason } = req.body;

    const updateObj = { updatedAt: new Date() };

    if (typeof startDate !== "undefined") updateObj.startDate = startDate;
    if (typeof endDate !== "undefined") updateObj.endDate = endDate;
    if (typeof reason !== "undefined") updateObj.reason = reason;
    if (typeof comment !== "undefined") updateObj.comment = comment;

    // ================= Validate Status =================
    if (typeof status !== "undefined") {
      const allowed = ["pending", "approved", "rejected"];
      if (!allowed.includes(status)) {
        return res
          .status(400)
          .json({ status: "error", message: "Invalid status value" });
      }

      updateObj.status = status;

      if (status === "approved" || status === "rejected") {
        if (req.user && (req.user.candidateId || req.user._id)) {
          updateObj.reviewedBy = req.user.candidateId || req.user._id;
        } else {
          console.warn(
            `Authenticated user ${req.user?._id} has no candidateId — reviewedBy not set automatically.`
          );
        }
      }
    }

    // ================= Authorization =================
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });
    }

    const isAdmin = req.user?.role === "admin" || req.user?.role === "reviewer";
    const requesterCandidateId = req.user?.candidateId || req.user?._id;

    if (!isAdmin) {
      if (leave.appliedBy?.toString() !== requesterCandidateId?.toString()) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      if (typeof status !== "undefined" && status !== "pending") {
        return res.status(403).json({
          status: "error",
          message: "Only admin/reviewer may change status",
        });
      }
    }

    // ================= Update Leave =================
    const updated = await Leave.findByIdAndUpdate(leaveId, updateObj, {
      new: true,
    })
      .populate("appliedBy", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName email");

    console.log("✏️ Leave updated:", updated);

    // ================= AUTO MARK CALENDAR WHEN APPROVED =================

    if (status === "approved") {
      console.log("🚨 LEAVE APPROVED");
      console.log("➡️ candidateId (appliedBy):", leave.appliedBy);
      console.log("➡️ reviewer (admin):", req.user?._id);
      console.log(
        "➡️ leave range:",
        startDate ?? leave.startDate,
        "→",
        endDate ?? leave.endDate
      );

      // 1️⃣ Find real user using candidateId
      const employee = await User.findOne({
        candidateId: leave.appliedBy,
      }).select("_id");

      if (!employee) {
        console.error("❌ No user found for candidateId:", leave.appliedBy);
      }

      const realUserId = employee?._id;

      console.log(
        "➡️ REAL USER ID (will be stored in DailyEntry):",
        realUserId
      );

      // 2️⃣ Mark DailyEntry
      await markApprovedLeaveDays(
        realUserId,
        startDate ?? leave.startDate,
        endDate ?? leave.endDate,
        req.user?._id,
        reason ?? leave.reason
      );

      console.log("📅 Leave days auto-marked in DailyEntry");
    }

    return res.status(200).json({ status: "success", data: updated });
  } catch (err) {
    console.error("❌ Error updating leave:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

// Delete leave
const deleteLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res
        .status(404)
        .json({ status: "error", message: "Leave not found" });
    }

    const isAdmin = req.user?.role === "admin" || req.user?.role === "reviewer";
    const requesterCandidateId = req.user?.candidateId || req.user?._id;

    // If not admin: only owner can delete and only if status is pending
    if (!isAdmin) {
      if (leave.appliedBy?.toString() !== requesterCandidateId?.toString()) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
      if (leave.status && leave.status !== "pending") {
        return res.status(400).json({
          status: "error",
          message: "Only pending leaves can be deleted by applicant",
        });
      }
    }

    await Leave.findByIdAndDelete(leaveId);
    console.log("🗑️ Leave deleted:", leaveId);
    return res
      .status(200)
      .json({ status: "success", message: "Leave deleted" });
  } catch (err) {
    console.error("❌ Error deleting leave:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};

module.exports = {
  createLeave,
  getLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
  getMyLeaves,
};
