const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  company: { type: mongoose.Types.ObjectId, ref: 'Company', default: null },
  candidateId: { type: mongoose.Types.ObjectId, ref: 'Candidate', default: null },
  name: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'hr', 'manager', 'employee','admin'],
    default: 'employee'
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.post("save", function (doc) {
  console.log("🧬 USER SAVED:", doc._id.toString(), doc.email);
});


// Optional method for password verification
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
