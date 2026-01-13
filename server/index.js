// two Files means  app.js --> only for Express to easy test the express routes without starting the actual server
// and the index.js to actual start the server via app.listen 

const app = require("./app");
const { connectDB } = require("./config/db.config");
const { startCron } = require("./jobs/attendanceCron");
const { startFcmCleanupCron } = require("./jobs/fcmCleanupCron");
const mongoose = require("mongoose");
if (process.env.NODE_ENV !== "test") {
  connectDB();

  mongoose.connection.once("open", async () => {
    console.log("💾 Database connected");
    // await ensureSuperAdmin();
    startCron();
    startFcmCleanupCron();

    const port = process.env.PORT || 3001;
    app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
  });
}
