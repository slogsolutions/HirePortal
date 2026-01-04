// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const cron = require('node-cron'); // ✅ for daily background jobs
const db = require('./config/db.config');
const { startCron } = require('./jobs/attendanceCron');
// ====== MODELS ======
const User = require('./models/User.model');
const DailyEntry = require('./models/DailyEntry.model'); // ✅ we'll create this model for attendance entries
const Holiday = require('./models/Holiday.model'); // ✅ admin-set holidays

// ====== ROUTES ======
const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidates.routes');
const scoreRoutes = require('./routes/scores.routes');
const offerRoutes = require('./routes/offers.routes');
const fcmRoutes = require('./routes/fcm.routes');
const rulesDocumentRoutes = require('./routes/documentRules.routes');
const verificationRoutes = require('./routes/verification.routes');
const interviewRoutes = require('./routes/interview.routes');
const leaveRoutes = require('./routes/leaves.routes');
const salaryRoutes = require('./routes/salary.routes');
const performanceRoutes = require('./routes/performace.route');
const attendanceRoutes = require("./routes/attendance.routes")
const sendRoutes = require("./routes/docs.routes")

const app = express();
// ====== CORS ======
const AllowedOrigin = [process.env.FRONTEND_URL, process.env.DEV_URL, '*'];
app.use(
  cors({
    origin: AllowedOrigin,
    methods: ['POST', 'GET', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// ====== BODY PARSING ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== STATIC FOLDERS ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/offers', express.static(path.join(__dirname, 'public', 'offers')));
app.use(
  '/template-images',
  express.static(path.join(__dirname, 'public', 'template-images'))
);
app.use('/static', express.static(path.join(__dirname, 'public')));

// ====== API ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api', offerRoutes);
app.use('/api/docs', rulesDocumentRoutes);
app.use('/api/candidates', verificationRoutes); // this
app.use('/api/candidates', interviewRoutes);
app.use('/api', fcmRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/attendance', attendanceRoutes);
// app.use('/api/docs', sendRoutes);



// ====== SERVE HTML TEMPLATE ======
app.get('/offerletter', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'offerletter.html'));
});

// ====== ROOT ======
app.get('/', (_, res) => res.json({ message: 'HirePortal backend running' }));


app.get('/test', (_, res) => res.json({ message: 'HirePortal backend updated testing' }));

app.get('/laksh', (_, res) => res.json({ message: 'HirePortal backend updated testing' }));

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || 'Server error' });
});

// Debug route map AFTER registering
app._router.stack
  .filter(r => r.route)
  .forEach(r => console.log(r.route.path, Object.keys(r.route.methods)));



// ====== AUTO-CREATE SUPER ADMIN ======
async function ensureSuperAdmin() {
  try {
    const existing = await User.findOne({ role: 'superadmin' });
    if (!existing) {
      const email = process.env.SUPERADMIN_EMAIL || 'admin@hireportal.com';
      const password = process.env.SUPERADMIN_PASSWORD || 'Super@123';
      const hashed = await bcrypt.hash(password, 10);

      const admin = await User.create({
        name: 'Super Admin',
        email,
        password: hashed,
        role: 'superadmin',
      });

      console.log('✅ Super Admin created:', {
        email: admin.email,
        password: process.env.SUPERADMIN_PASSWORD || 'Super@123',
      });
    } else {
      console.log('🟢 Super Admin already exists');
    }
  } catch (err) {
    console.error('❌ Error ensuring Super Admin:', err);
  }
}

// ====== DAILY CRON JOB (Auto Absent Marker) ======
//
// Purpose:
// - Every day at 12:00 PM, check previous working days
// - If any day (Mon–Sat) is not filled by user and not a leave or holiday,
//   mark it automatically as "Absent / No Reporting"
// - Keeps the reporting cycle clean and automated.
//
// cron.schedule(


//   '0 12 * * *', // Every day at 12:00 PM server time
//   async () => {
//     try {
//       console.log('🕛 Running daily attendance check...');
//       const today = new Date();
//       const yesterday = new Date();
//       yesterday.setDate(today.getDate() - 1);

//       const dayOfWeek = yesterday.getDay(); // Sunday=0, Saturday=6
//       if (dayOfWeek === 0) return console.log('🟡 Sunday – no check needed.');

//       // Skip if yesterday was a global holiday
//       const holiday = await Holiday.findOne({ date: yesterday });
//       if (holiday) return console.log(`🟢 ${holiday.name} – holiday, skipping.`);

//       // Find all entries missing for yesterday
//       const missingEntries = await DailyEntry.find({
//         date: yesterday,
//         tag: { $exists: false },
//       });

//       const updates = [];
//       for (const entry of missingEntries) {
//         entry.tag = 'Absent';
//         entry.auto_marked = true;
//         await entry.save();
//         updates.push(entry.user_id);
//       }

//       if (updates.length) {
//         console.log(
//           `⚠️ Auto-marked ${updates.length} users as Absent for ${yesterday.toDateString()}`
//         );
//       } else {
//         console.log(`✅ No missing entries for ${yesterday.toDateString()}`);
//       }
//     } catch (err) {
//       console.error('❌ Cron job error:', err.message);
//     }
//   },
//   {
//     timezone: 'Asia/Kolkata', // set your region
//   }
// );

// ====== START SERVER ======
const port = process.env.PORT || 5000;
mongoose.connection.once('open', async () => {
  console.log('💾 Database connected');
  await ensureSuperAdmin();


  startCron();
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
});

module.exports = app;
