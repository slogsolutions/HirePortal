const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const candidateRoutes = require("./routes/candidates.routes");
const scoreRoutes = require("./routes/scores.routes");
const offerRoutes = require("./routes/offers.routes");
const fcmRoutes = require("./routes/fcm.routes");
const notificationRoutes = require("./routes/notification.routes");
const rulesDocumentRoutes = require("./routes/documentRules.routes");
const verificationRoutes = require("./routes/verification.routes");
const interviewRoutes = require("./routes/interview.routes");
const leaveRoutes = require("./routes/leaves.routes");
const salaryRoutes = require("./routes/salary.routes");
const performanceRoutes = require("./routes/performace.route");
const attendanceRoutes = require("./routes/attendance.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/offers", express.static(path.join(__dirname, "public", "offers")));

app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api", offerRoutes);
app.use("/api/docs", rulesDocumentRoutes);
app.use("/api/candidates", verificationRoutes);
app.use("/api/candidates", interviewRoutes);
app.use("/api", fcmRoutes);
app.use("/api", notificationRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/attendance", attendanceRoutes);

app.get("/health", (req, res) => res.status(200).send("OK"));
app.get("/laksh", (req, res) => res.status(200).send("OK"));

module.exports = app;
