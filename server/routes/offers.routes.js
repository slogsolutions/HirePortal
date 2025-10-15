// routes/offers.routes.js
const express = require('express');
const router = express.Router();
const {
  generateOffer,
  previewOffer,
  downloadOffer,
  sendOfferEmail,
  listOffers,      //  newly added
  deleteOffer      //  newly added
} = require('../controllers/offer.controller');

// Candidate-scoped
router.post('/candidates/:id/offer/generate', generateOffer);
router.get('/candidates/:id/offers', /* implement listOffersForCandidate if desired */ (req,res)=>res.status(404).send('not implemented'));

// Offer-scoped
router.get('/offers/:offerId/preview', previewOffer);
router.get('/offers/:offerId/download', downloadOffer);
router.post('/offers/:offerId/send-email', sendOfferEmail);

//  New routes added below
router.get('/offers', listOffers);               // List all generated offers
router.delete('/offers/:offerId', deleteOffer);  // Delete offer (DB + PDF)

module.exports = router;
