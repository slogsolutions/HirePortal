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

// Update leave
const updateLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const updateData = req.body;
    const leave = await Leave.findByIdAndUpdate(leaveId, updateData, { new: true })
      .populate('appliedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email');

    console.log("✏️ Leave updated:", leave);
    res.status(200).json({ status: 'success', data: leave });
  } catch (err) {
    console.error("❌ Error updating leave:", err);
    res.status(500).json({ status: 'error', message: err.message });
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
