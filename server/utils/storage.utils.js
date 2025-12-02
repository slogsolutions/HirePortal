const fs = require('fs');
const path = require('path');
// const AWS = require('aws-sdk');

async function saveFileLocal(file, candidateId) {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'candidates', candidateId.toString());
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const ext = (file.originalname || '').split('.').pop();
  const filename = `${Date.now()}_${file.filename || Math.random().toString(36).slice(2)}.${ext}`;
  const dest = path.join(uploadsDir, filename);
  fs.renameSync(file.path, dest);
  return `/uploads/candidates/${candidateId}/${filename}`;
}

async function uploadToS3IfConfigured(localFilePath, keyName) {
  if (!process.env.AWS_S3_BUCKET) return null;
  const s3 = new AWS.S3({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: process.env.AWS_REGION });
  const fileContent = fs.readFileSync(localFilePath);
  const params = { Bucket: process.env.AWS_S3_BUCKET, Key: keyName, Body: fileContent, ACL: 'private' };
  return s3.upload(params).promise();
}

module.exports = { saveFileLocal, uploadToS3IfConfigured };
