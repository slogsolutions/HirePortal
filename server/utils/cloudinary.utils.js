// utils/cloudinary.utils.js
const cloudinary = require("cloudinary").v2;
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a Buffer to Cloudinary as a raw resource (keeps PDF/other extensions)
 * Returns the Cloudinary result object.
 */
const uploadBuffer = (buffer, filename, folder = "documents") => {
  return new Promise((resolve, reject) => {
    try {
      const ext = path.extname(filename) || ".pdf";
      const base = path.basename(filename, ext);
      const publicId = `${Date.now()}-${base}${ext}`;

      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto", // "auto" allows images/pdf; use "image" for images only
          public_id: publicId,
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { cloudinary, uploadBuffer };
