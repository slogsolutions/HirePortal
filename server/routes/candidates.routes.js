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
  changePassword   // <- ensure your controller exports this
} = require('../controllers/candidate.controller');

const router = express.Router();

// Get logged-in candidate
router.get("/me", protect, me);

// Change password (logged-in user)
router.post('/me/change-password', protect, changePassword);

// Change password for a specific candidate (admin/HR may use this)
// If you want to restrict this route to hr/admin, uncomment the requireRole middleware below.
router.post('/:id/change-password', protect /*, requireRole(['hr','admin'])*/, changePassword);

// List/create
router.get('/', protect, requireRole(['hr','admin']), listCandidates);
router.post('/', protect, requireRole(['hr','admin']), createCandidate);

// Single
router.get('/:id', protect, getCandidate);
router.put('/:id', protect, updateCandidate);
router.delete('/:id', protect, deleteCandidate);

// Upload profile photo (multipart form, field name "photo")
router.post('/:id/photo', protect, upload.single('photo'), uploadProfilePhoto);

module.exports = router;
