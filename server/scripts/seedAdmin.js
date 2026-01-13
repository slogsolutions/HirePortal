const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");

dotenv.config();

async function seedAdmin() {
  // 🚫 Do NOTHING in test mode
  if (process.env.NODE_ENV === "test") {
    console.log("Skipping admin seed in test environment");
    process.exit(0);
  }

  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const password = process.env.ADMIN_PASSWORD || "Admin@Slog";
  const hashed = await bcrypt.hash(password, 10);

  const admin = await User.create({
    name: "Slog Solutions",
    email: "admin@slog.com",
    password: hashed,
    role: "admin",
  });

  console.log("Admin created:", admin.email, "with password", password);
  process.exit(0);
}

seedAdmin();
