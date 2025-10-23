const mongoose = require('mongoose');

const adjustmentSchema = new mongoose.Schema({
  reason: { type: String, trim: true },
  amount: { type: Number, default: 0 } // +ve to add, -ve to deduct
}, { _id: false });

const salarySchema = new mongoose.Schema({
  candidate: { type: mongoose.Types.ObjectId, ref: 'Candidate', required: true },
  period: {
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true }
  },

  // inputs
  baseSalary: { type: Number, required: true }, // monthly gross
  workingDaysInMonth: { type: Number, default: 30 },
  hoursPerDay: { type: Number, default: 8 },

  advance: { type: Number, default: 0 },
  overtimeDays: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  leavesTaken: { type: Number, default: 0 },
  epf: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  expense: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  adjustments: { type: [adjustmentSchema], default: [] },

  // calculated snapshot (saved when created/updated)
  perDay: { type: Number, default: 0 },
  perHour: { type: Number, default: 0 },
  overtimeFromDays: { type: Number, default: 0 },
  overtimeFromHours: { type: Number, default: 0 },
  lateDeduction: { type: Number, default: 0 },
  additions: { type: Number, default: 0 },
  leaveDeduction: { type: Number, default: 0 },
  adjustmentsTotal: { type: Number, default: 0 },
  grossPay: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },

  remarks: String,

  createdBy: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['draft','finalized','paid'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.models.Salary || mongoose.model('Salary', salarySchema);
