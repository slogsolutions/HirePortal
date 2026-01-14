require("dotenv").config();
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

  // 🔥 Always reset E2E user to avoid stale hashes
  await User.deleteMany({ email });

  const hash = await bcrypt.hash(password, 10);

  await User.create({
    name: "E2E User",
    email,
    password: hash,
    role: "admin",
  });

  console.log("🧪 E2E user seeded with fresh hash");
}

async function start() {
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
