const mongoose = require('mongoose');

const otpSubSchema = new mongoose.Schema({
  hash: String,
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  lastSentAt: Date
}, { _id: false });

const candidateSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, trim: true, lowercase: true },
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

empCode: { type: String, unique: true, sparse: true },


  fatherName: String,
  fatherMobile: String,
  fatherMobileVerified: { type: Boolean, default: false },

  // New verification fields
  emailVerified: { type: Boolean, default: false },
  aadhaarVerified: { type: Boolean, default: false },

  // Candidate ↔ User link
  userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },

  // lastOffer reference (if you have offers)
  lastOffer: { type: mongoose.Types.ObjectId, ref: 'Offer', default: null },

  dob: Date,
  department: String,

  // Marital details
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
 mobileOtp: otpSubSchema,
  emailOtp: otpSubSchema,
  fatherMobileOtp: otpSubSchema,
  // IDs and policy info
  aadhaarNumber: String,
  panNumber: String,
  drivingLicenseNumber: String,
  pfNumber: String,
  esicNumber: String,
  medicalPolicyNumber: String,

  aadhaarData: { type: Object, default: null },
  documents: [{ type: mongoose.Types.ObjectId, ref: 'Document' }],

  status: {
    type: String,
    enum: ['applied', 'verifying', 'interviewing', 'offered', 'accepted', 'rejected'],
    default: 'applied'
  },

  // Interview evaluation summary
  scoresSummary: {
    hr: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    technical: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    founder: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
    weightedAvg: Number
  },

  createdAt: { type: Date, default: Date.now }
});

// Safe export to avoid overwrite errors during development reloads
module.exports = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);

// -------OLD 

// const mongoose = require('mongoose');

// const candidateSchema = new mongoose.Schema({
//   firstName: { type: String, required: true, trim: true },
//   lastName: { type: String, required: true, trim: true },
//   email: { type: String, trim: true, lowercase: true, required: true },
//   mobile: { type: String, required: true },
//   AlternativeMobile: String,

//   BloodGroup: { type: String, required: true },
//   DateOfJoining: { type: Date, required: true },
//   photoUrl: { type: String, required: true },
//   Designation: { type: String, required: true },
//   Salary: { type: String, required: true },
//   NextIncreament: String,
//   NextIncreamentDate: String,
//   Gender: { type: String, enum: ['male', 'female'], required: true },
//   MotherName: { type: String, required: true },
//   mobileVerified: { type: Boolean, default: false },

//   fatherName: { type: String, required: true },
//   fatherMobile: { type: String, required: true },
//   fatherMobileVerified: { type: Boolean, default: false },

//   // New verification fields
//   emailVerified: { type: Boolean, default: false },
//   aadhaarVerified: { type: Boolean, default: false },

//   // Candidate ↔ User link
//   userId: { type: mongoose.Types.ObjectId, ref: 'User', default: null },

//   // lastOffer reference (if you have offers)
//   lastOffer: { type: mongoose.Types.ObjectId, ref: 'Offer', default: null },

//   dob: { type: Date, required: true },
//   department: { type: String, required: true },

//   // Marital details
//   isMarried: { type: Boolean, default: false },
//   spouseName: String,
//   spouseNumber: String,

//   // Addresses
//   address: {
//     current: {
//       line1: { type: String, required: true },
//       line2: String,
//       city: { type: String, required: true },
//       state: { type: String, required: true },
//       pincode: { type: String, required: true }
//     },
//     permanent: {
//       line1: String,
//       line2: String,
//       city: String,
//       state: String,
//       pincode: String
//     },
//     isPermanentSameAsCurrent: { type: Boolean, default: false },
//     isPG: { type: Boolean, default: false },
//     pgOwnerName: String,
//     pgName: String,
//     pgNumber: String
//   },

//   // IDs and policy info
//   aadhaarNumber: { type: String, required: true },
//   panNumber: { type: String, required: true },
//   drivingLicenseNumber: { type: String, required: true },
//   pfNumber: String,
//   esicNumber: String,
//   medicalPolicyNumber: String,

//   aadhaarData: { type: Object, default: null },
//   documents: [{ type: mongoose.Types.ObjectId, ref: 'Document' }],

//   status: {
//     type: String,
//     enum: ['applied', 'verifying', 'interviewing', 'offered', 'accepted', 'rejected'],
//     default: 'applied'
//   },

//   // Interview evaluation summary
//   scoresSummary: {
//     hr: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
//     technical: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
//     founder: { score: Number, comments: String, by: mongoose.Types.ObjectId, at: Date },
//     weightedAvg: Number
//   },

//   createdAt: { type: Date, default: Date.now }
// });

// // Safe export
// module.exports = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
