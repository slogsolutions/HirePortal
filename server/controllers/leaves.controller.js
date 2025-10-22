const Leave = require('../models/Leaves.model');

// Create leave
const createLeave = async (req, res) => {
  try {
    console.log("entered createdLeave")
    const { startDate, endDate, reason } = req.body;
    const appliedBy = req.user.candidateId; // Must come from auth middleware
    console.log("🆕 Creating leave for candidate:", appliedBy);

    const leave = await Leave.create({ startDate, endDate, reason, appliedBy });
    console.log("✅ Leave created:", leave);

    const populatedLeave = await leave.populate('appliedBy', 'firstName lastName email');
    res.status(201).json({ status: 'success', data: populatedLeave });
  } catch (err) {
    console.error("❌ Error creating leave:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};




//getLeavesById
const getLeaveById = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await Leave.findById(leaveId)
      .populate('appliedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email');

    console.log("📄 Fetched leave by ID:", leave);

    if (!leave) {
      return res.status(404).json({ status: 'error', message: 'Leave not found' });
    }

    res.status(200).json({ status: 'success', data: leave });
  } catch (err) {
    console.error("❌ Error fetching leave by ID:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
 
// Get leaves
const getLeaves = async (req, res) => {
  try {
    const filter = {};
    if (req.query.future === 'true') {
      filter.startDate = { $gte: new Date() };
    }
    const leaves = await Leave.find(filter)
      .populate('appliedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log("✅ Leaves fetched from DB:", leaves);
    res.status(200).json({ status: 'success', data: leaves });
  } catch (err) {
    console.error("❌ Error fetching leaves:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Update leave   OLD without reviewdBy 
// const updateLeave = async (req, res) => {
//   try {
//     const leaveId = req.params.id;
//     const updateData = req.body;
//     const leave = await Leave.findByIdAndUpdate(leaveId, updateData, { new: true })
//       .populate('appliedBy', 'firstName lastName email')
//       .populate('reviewedBy', 'firstName lastName email');

//     console.log("✏️ Leave updated:", leave);
//     res.status(200).json({ status: 'success', data: leave });
//   } catch (err) {
//     console.error("❌ Error updating leave:", err);
//     res.status(500).json({ status: 'error', message: err.message });
//   }
// };

// Update leave (improved) - put in your controller file
const updateLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { status, comment, startDate, endDate, reason } = req.body;

    // Build update object carefully to avoid overwriting fields unintentionally
    const updateObj = { updatedAt: new Date() };

    // allow editing of dates/reason by requester (if authorized) — include only if provided
    if (typeof startDate !== "undefined") updateObj.startDate = startDate;
    if (typeof endDate !== "undefined") updateObj.endDate = endDate;
    if (typeof reason !== "undefined") updateObj.reason = reason;
    if (typeof comment !== "undefined") updateObj.comment = comment;

    // If status provided, validate and set it; when approving/rejecting, set reviewedBy
    if (typeof status !== "undefined") {
      const allowed = ["pending", "approved", "rejected"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ status: "error", message: "Invalid status value" });
      }
      updateObj.status = status;

      // If changing to approved/rejected, set reviewedBy from req.user.candidateId (if present)
      if (status === "approved" || status === "rejected") {
        if (req.user && req.user.candidateId) {
          updateObj.reviewedBy = req.user.candidateId;
        } else {
          // If authenticated user does not have candidateId, we still allow the update but log warning
          console.warn(`Authenticated user ${req.user?._id} has no candidateId — reviewedBy not set automatically.`);
        }
      }
    }

    // Apply update and return populated document
    const leave = await Leave.findByIdAndUpdate(leaveId, updateObj, { new: true })
      .populate("appliedBy", "firstName lastName email")
      .populate("reviewedBy", "firstName lastName email");

    if (!leave) {
      return res.status(404).json({ status: "error", message: "Leave not found" });
    }

    console.log("✏️ Leave updated:", leave);
    res.status(200).json({ status: "success", data: leave });
  } catch (err) {
    console.error("❌ Error updating leave:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Delete leave
const deleteLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    await Leave.findByIdAndDelete(leaveId);
    console.log("🗑️ Leave deleted:", leaveId);
    res.status(200).json({ status: 'success', message: 'Leave deleted' });
  } catch (err) {
    console.error("❌ Error deleting leave:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = { createLeave, getLeaves, updateLeave, deleteLeave,getLeaveById };
