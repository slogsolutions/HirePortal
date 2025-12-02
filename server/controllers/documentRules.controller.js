const Document = require("../models/RulesDocument.model");
const { uploadBuffer } = require("../utils/cloudinary.utils");
const { cloudinary } = require("../utils/cloudinary.utils"); 

const uploadDocument = async (req, res) => {
  try {
    const file = req.file;
    const { title } = req.body;

    if (!file) return res.status(400).json({ error: "File is required (form field 'file')" });
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });

    // Upload buffer to Cloudinary
    const result = await uploadBuffer(file.buffer, file.originalname, "documents");

    // Save minimal doc (you said earlier you want simple model)
    const doc = new Document({
      title: title.trim(),
      filename: file.originalname,
      cloudinaryUrl: result.secure_url,
      createdAt: new Date(),
    });

    await doc.save();
    return res.json(doc);
  } catch (err) {
    console.error("uploadDocument error:", err);
    // Multer errors
    if (err && err.name === "MulterError") {
      return res.status(400).json({ error: "Multer error", message: err.message, code: err.code });
    }
    return res.status(500).json({ error: "Upload failed", detail: err.message || err });
  }
};


const listDocuments = async (req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error("listDocuments error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    // redirect to Cloudinary public URL (works for preview and download)
    res.redirect(doc.cloudinaryUrl);
  } catch (err) {
    console.error("downloadDocument error:", err);
    res.status(500).json({ error: "Download failed" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("inside the delete route")
    
    const doc = await Document.findById(id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Optional: delete from Cloudinary
    if (doc.cloudinaryUrl) {
      // Extract public_id from URL (Cloudinary URL format: https://res.cloudinary.com/<cloud_name>/.../<public_id>.<ext>)
      const parts = doc.cloudinaryUrl.split("/");
      const fileWithExt = parts[parts.length - 1];
      const publicId = fileWithExt.replace(/\.[^/.]+$/, ""); // remove extension
      await cloudinary.uploader.destroy(`documents/${publicId}`, { resource_type: "raw" });
    }

    await doc.deleteOne();
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("deleteDocument error:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
};

module.exports = { uploadDocument, listDocuments, downloadDocument,deleteDocument };
