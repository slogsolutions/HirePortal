// // two Files means  app.js --> only for Express to easy test the express routes without starting the actual server
// // and the index.js to actual start the server via app.listen 

// const app = require("./app");
// const { connectDB } = require("./config/db.config");
// const { startCron } = require("./jobs/attendanceCron");
// const { startFcmCleanupCron } = require("./jobs/fcmCleanupCron");
//   const User = require("./models/User.model");
// const mongoose = require("mongoose");
// if (process.env.NODE_ENV !== "test") {
//   connectDB();



// async function seedTestUser() {
//   if (process.env.NODE_ENV !== "test") return;

//   const exists = await User.findOne({ email: "admin@test.com" });
//   if (exists) return;

//   await User.create({
//     name: "Test Admin",
//     email: "admin@test.com",
//     password: "123456",
//     role: "admin",
//   });

//   console.log("🧪 Test admin created");
// }

// seedTestUser();


//   mongoose.connection.once("open", async () => {
//     console.log("Database connected");
//     // await ensureSuperAdmin();
//     startCron();
//     startFcmCleanupCron();

//     const port = process.env.PORT || 3001;
//     app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
//   });
// }

require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db.config");
const { startCron } = require("./jobs/attendanceCron");
const { startFcmCleanupCron } = require("./jobs/fcmCleanupCron");
const User = require("./models/User.model");
const mongoose = require("mongoose");

async function seedTestUser() {
  if (process.env.NODE_ENV !== "test") return;

  const exists = await User.findOne({ email: "admin@test.com" });
  if (exists) return;

  await User.create({
    name: "Test Admin",
    email: "admin@test.com",
    password: "123456",
    role: "admin",
  });

  console.log("🧪 Test admin created");
}

async function startServer() {
  await connectDB();
  await seedTestUser();

  mongoose.connection.once("open", () => {
    console.log("Database connected");

    if (process.env.NODE_ENV !== "test") {
      startCron();
      startFcmCleanupCron();
    }

    const port = process.env.PORT || 3001;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  });
}

startServer();
