// index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const db = require('./config/db.config'); // ensure this connects to mongoose

// ====== ROUTES ======
const authRoutes = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidates.routes');
const scoreRoutes = require('./routes/scores.routes');
const offerRoutes = require('./routes/offers.routes');           // candidate & offer routes
const rulesDocumentRoutes = require('./routes/documentRules.routes');

const verificationRoutes = require('./routes/verification.routes'); // expects /:id/verify/...
const interviewRoutes = require('./routes/interview.routes');       // expects /:id/interviews

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

// Uploads (user uploaded files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Generated offer files
app.use('/offers', express.static(path.join(__dirname, 'public', 'offers')));

// Template images (for HTML templates, e.g., offer letters)
app.use('/template-images', express.static(path.join(__dirname, 'public', 'template-images')));

// Optional: Serve other static assets in public (CSS, JS)
app.use('/static', express.static(path.join(__dirname, 'public')));

// ====== API ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api', offerRoutes);
app.use('/api/docs', rulesDocumentRoutes);

// ====== Candidate sub-routes (verification & interviews) ======
app.use('/api/candidates', verificationRoutes);
app.use('/api/candidates', interviewRoutes);

// ====== SERVE HTML TEMPLATES ======
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

// ====== START SERVER ======
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;
