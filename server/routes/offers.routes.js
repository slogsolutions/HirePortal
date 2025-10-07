const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const { generateOffer, sendOffer, updateOfferStatus } = require('../controllers/offer.controller');

const router = express.Router();

router.post('/generate/:candidateId', protect, requireRole(['hr','admin']), generateOffer);
router.post('/send/:offerId', protect, requireRole(['hr','admin']), sendOffer);
router.patch('/:offerId/status', protect, requireRole(['hr','admin','reception']), updateOfferStatus);

module.exports = router;
