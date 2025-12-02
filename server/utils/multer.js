// utils/multer.js
const multer = require("multer");

// memory storage to get file.buffer for cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;
