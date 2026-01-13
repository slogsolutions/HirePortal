// scripts/seedAdmin.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");

dotenv.config();

async function seedAdmin() {
  if (process.env.NODE_ENV !== "test") {
    mongoose.connection.once("open", async () => {
      console.log("💾 Database connected");
      await ensureSuperAdmin();
    });
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
