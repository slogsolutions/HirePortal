// routes/document.routes.js
const express = require("express");
const router = express.Router();

const upload = require("../utils/multer"); // must export multer instance
const {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument
} = require("../controllers/documentRules.controller");

// POST /api/docs/upload
router.post("/upload", upload.single("file"), uploadDocument);

// GET /api/docs/list
router.get("/list", listDocuments);

// GET /api/docs/:id/download
router.get("/:id/download", downloadDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
