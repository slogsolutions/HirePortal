const express = require("express");
const router = express.Router();
const { sendDocument } = require("../controllers/sendDocument.controller");
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
// ... other imports and routes

router.post("/send", sendDocument);

module.exports = router;
