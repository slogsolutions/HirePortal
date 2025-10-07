const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  mobile: String,
  AlternativeMobile: String,
  BloodGroup: String,
  DateOfJoining: Date,
  photoUrl: String,
  Designation: String,
  Salary: String,
  NextIncreament: String,
  NextIncreamentDate: String,
  Gender: { type: String, enum: ['male', 'female'] },
  MotherName: String,
  mobileVerified: { type: Boolean, default: false },
  fatherName: String,
  fatherMobile: String,
  fatherMobileVerified: { type: Boolean, default: false },
  dob: Date,
  department: String, // New field

  // Marital status
  isMarried: { type: Boolean, default: false },
  spouseName: String,
  spouseNumber: String,

  // Addresses
  address: {
    current: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String
    },
    permanent: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String
    },
    isPermanentSameAsCurrent: { type: Boolean, default: false },
    isPG: { type: Boolean, default: false },
    pgOwnerName: String,
    pgName: String,
    pgNumber: String
  },

  // IDs & policies (optional fields)
  aadhaarNumber: String,
  panNumber: String,
  drivingLicenseNumber: String,
  pfNumber: String,
  esicNumber: String,
  medicalPolicyNumber: String,

  aadhaarData: { type: Object, default: null },
  documents: [{ type: mongoose.Types.ObjectId, ref: 'Document' }],
  status: { type: String, enum: ['applied','verifying','interviewing','offered','accepted','rejected'], default: 'applied' },

  // Scores summary
  scoresSummary: {
    hr: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    technical: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    founder: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    weightedAvg: Number
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Candidate', candidateSchema);
