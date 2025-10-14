const express = require("express");
const router = express.Router();
const { sendDocument } = require("../controllers/sendDocument.controller");
// ... other imports and routes

router.post("/send", sendDocument);

module.exports = router;
