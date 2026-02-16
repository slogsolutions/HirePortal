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

// Android App Links verification
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.slogsolutions.slogems",
        sha256_cert_fingerprints: [
          "65:96:7E:41:62:B8:EA:20:9E:5D:67:73:0B:D3:B7:AE:2F:A6:51:8B:C2:84:09:A4:A3:5C:15:61:75:EC:7B:59",
          "16:95:FF:24:B6:3C:AE:BB:4D:E1:4C:46:7B:81:5F:D1:7F:C5:3F:80:41:6C:0B:7F:75:36:E7:09:D3:46:26:CE"
        ]
      }
    }
  ]);
});


app.get("/health", (req, res) => res.status(200).send("OK"));
// app.get("/laksh", (req, res) => res.status(200).send("OK"));

module.exports = app;
