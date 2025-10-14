
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
} = require('../controllers/candidate.controller');

const router = express.Router();

// List/create
router.get('/', protect, requireRole(['hr','admin']), listCandidates);
router.post('/', protect, requireRole(['reception','hr','admin']), createCandidate);

// Single
router.get('/:id', protect, getCandidate);
router.put('/:id', protect, updateCandidate);
router.delete('/:id', protect, deleteCandidate);

// Upload profile photo (multipart form, field name "photo")
router.post('/:id/photo', protect, upload.single('photo'), uploadProfilePhoto);

module.exports = router;
