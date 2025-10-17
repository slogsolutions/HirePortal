// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const db = require('./config/db.config'); // ensure this connects to mongoose

// ====== MODELS ======
const User = require('./models/User.model'); // make sure path is correct

// ====== ROUTES ======
const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidates.routes');
const scoreRoutes = require('./routes/scores.routes');
const offerRoutes = require('./routes/offers.routes');
const rulesDocumentRoutes = require('./routes/documentRules.routes');
const verificationRoutes = require('./routes/verification.routes');
const interviewRoutes = require('./routes/interview.routes');

const app = express();

// ====== CORS ======
const AllowedOrigin = [process.env.FRONTEND_URL, process.env.DEV_URL, '*'];
app.use(cors({
  origin: AllowedOrigin,
  methods: ["POST", "GET", "PATCH", "PUT", "DELETE", "OPTIONS"]
}));

// ====== BODY PARSING ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== STATIC FOLDERS ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/offers', express.static(path.join(__dirname, 'public', 'offers')));
app.use('/template-images', express.static(path.join(__dirname, 'public', 'template-images')));
app.use('/static', express.static(path.join(__dirname, 'public')));

// ====== API ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api', offerRoutes);
app.use('/api/docs', rulesDocumentRoutes);
app.use('/api/candidates', verificationRoutes);
app.use('/api/candidates', interviewRoutes);

// ====== SERVE HTML TEMPLATE ======
app.get('/offerletter', (req, res) => {
  res.sendFile(path.join(__dirname, 'template', 'offerletter.html'));
});

// ====== ROOT ======
app.get('/', (_, res) => res.json({ message: 'HirePortal backend running' }));

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

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
        role: 'superadmin'
      });

      console.log('✅ Super Admin created:', {
        email: admin.email,
        password: process.env.SUPERADMIN_PASSWORD || 'Super@123'
      });
    } else {
      console.log('✅ Super Admin already exists');
    }
  } catch (err) {
    console.error('❌ Error ensuring Super Admin:', err);
  }
}

// ====== START SERVER ======
const port = process.env.PORT || 5000;

// Wait for DB connection before starting
mongoose.connection.once('open', async () => {
  console.log('✅ Database connected');
  await ensureSuperAdmin();

  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
});

module.exports = app;
