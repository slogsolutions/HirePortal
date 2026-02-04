require("dotenv").config();
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const { debugMongoNetwork } = require("./mongoNetworkDebug");


const app = require("./app");
const { connectDB } = require("./config/db.config");
const { startCron } = require("./jobs/attendanceCron");
const { startFcmCleanupCron } = require("./jobs/fcmCleanupCron");
const User = require("./models/User.model");
const bcrypt = require("bcrypt");

async function seedTestUser() {
  if (process.env.NODE_ENV !== "test") return;

  const email = "login@test.com";
  const password = "123456";

  await User.deleteMany({ email });

  await User.create({
    name: "E2E User",
    email,
    password,   // 🔥 plain text — model will hash it
    role: "admin",
  });


  console.log("🧪 E2E user seeded (model will hash)");
}


async function start() {
  await debugMongoNetwork();
  await connectDB();
  await seedTestUser();

  if (process.env.NODE_ENV !== "test") {
    startCron();
    startFcmCleanupCron();
  }

  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`🚀 Server running on ${port}`);
  });
}

start();
