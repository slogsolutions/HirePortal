// const express = require('express');
// const multer = require('multer');
// const { protect } = require('../middlewares/auth.middleware');
// const { requireRole } = require('../middlewares/roles.middleware');
// const {
//   createCandidate,
//   getCandidate,
//   updateCandidate,
//   deleteCandidate,
//   listCandidates,        // <-- added
// } = require('../controllers/candidate.controller');

// const router = express.Router();
// const upload = multer({ dest: 'uploads/tmp/' });

// // List all candidates (HR/Admin)
// router.get('/', protect, requireRole(['hr','admin']), listCandidates);

// // Create candidate at reception/HR/Admin
// router.post('/', protect, requireRole(['reception','hr','admin']), createCandidate);

// // Get single candidate by ID
// router.get('/:id', protect, getCandidate);

// // Update candidate by ID
// router.put('/:id', protect, updateCandidate);

// // Delete candidate by ID
// router.delete('/:id', protect, deleteCandidate);

// // Upload & list documents (optional, uncomment if needed)
// // router.post('/:id/documents', protect, upload.single('file'), uploadDocument);
// // router.get('/:id/documents', protect, listDocuments);

// module.exports = router;
// routes/candidates.routes.js


const express = require('express');
const upload = require('../utils/multer'); // memoryStorage multer
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
