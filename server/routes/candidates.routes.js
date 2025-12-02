// const express = require('express');
// const upload = require('../utils/multer'); 
// const { protect } = require('../middlewares/auth.middleware');
// const { requireRole } = require('../middlewares/roles.middleware');
// const {
//   createCandidate,
//   getCandidate,
//   updateCandidate,
//   deleteCandidate,
//   listCandidates,
//   uploadProfilePhoto,
//   me,
//   changePassword,   // <- ensure your controller exports this
//   getNextEmpCode,
// listCandidatesWithEmpCodes
// } = require('../controllers/candidate.controller');

// const router = express.Router();

// // Get logged-in candidate
// router.get("/me", protect, me);

// // Change password (logged-in user)
// router.post('/me/change-password', protect, changePassword);

// // Change password for a specific candidate (admin/HR may use this)
// // If you want to restrict this route to hr/admin, uncomment the requireRole middleware below.
// router.post('/:id/change-password', protect /*, requireRole(['hr','admin'])*/, changePassword);

// // List/create
// router.get('/', protect, requireRole(['hr','admin']), listCandidates);
// router.post('/', protect, requireRole(['hr','admin']), createCandidate);
// // GET /candidates/next-empcode

// router.get('/next-empcode', protect, requireRole(['hr','admin']), getNextEmpCode);

// // Single
// router.get('/:id', protect, getCandidate);
// router.put('/:id', protect, updateCandidate);
// router.delete('/:id', protect, deleteCandidate);

// // Upload profile photo (multipart form, field name "photo")
// router.post('/:id/photo', protect, upload.single('photo'), uploadProfilePhoto);
// // Protect this route: HR and Admin only
// router.get('/empcodes', protect, requireRole(['hr','admin']), listCandidatesWithEmpCodes);

// module.exports = router;


// ---- in up there is static routes vs dynamic erorr so learn what is this and in down its fixed 




// routes/candidates.routes.js  (update accordingly)
const express = require('express');
const upload = require('../utils/multer');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');

const {
  createCandidate,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  listCandidates,
  uploadProfilePhoto,
  me,
  changePassword,
  getNextEmpCode,
  listCandidatesWithEmpCodes
} = require('../controllers/candidate.controller');

const router = express.Router();

// Get logged-in candidate
router.get("/me", protect, me);

// Change password (logged-in user)
router.post('/me/change-password', protect, changePassword);

// Change password for a specific candidate
router.post('/:id/change-password', protect /*, requireRole(['hr','admin'])*/, changePassword);

// List/create
router.get('/', protect, requireRole(['hr','admin']), listCandidates);
router.post('/', protect, requireRole(['hr','admin']), createCandidate);

// GET next emp code
router.get('/next-empcode', protect, requireRole(['hr','admin']), getNextEmpCode);

// IMPORTANT: register static empcodes route BEFORE any "/:id" route
router.get('/empcodes', protect, requireRole(['hr','admin']), listCandidatesWithEmpCodes);

// Optional alias so frontend can call /api/employees (if you prefer that route)
// This simply reuses same controller — protects to hr/admin as well
router.get('/employees', protect, requireRole(['hr','admin']), listCandidatesWithEmpCodes);

// Single (these are dynamic and must come after static paths)
router.get('/:id', protect, getCandidate);
router.put('/:id', protect, updateCandidate);
router.delete('/:id', protect, deleteCandidate);

// Upload profile photo (multipart form, field name "photo")
router.post('/:id/photo', protect, upload.single('photo'), uploadProfilePhoto);

module.exports = router;

