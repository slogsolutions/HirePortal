require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User.model");

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI || "mongodb+srv://SLOG:aVTJUIBvSraMwARc@cluster0.ii34a.mongodb.net/hireportal");

    console.log("Connected.");

    const email = "admin@test.com";

    const existing = await User.findOne({ email });

    if (existing) {
      console.log("Admin already exists:", existing.email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash("123456", 10);

    const user = await User.create({
      name: "Admin",
      email: email,
      password: hashed,
      role: "admin",
      isVerified: true
    });

    console.log("Admin created successfully:");
    console.log({
      email: user.email,
      role: user.role,
      id: user._id
    });

    process.exit();
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
