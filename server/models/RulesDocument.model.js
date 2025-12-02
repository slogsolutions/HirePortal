// models/Document.model.js
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Document = mongoose.model("RulesDocument", documentSchema);
module.exports = Document;
