const admin = require('firebase-admin');
require('dotenv').config();

function buildServiceAccountFromFields() {
  const pk = process.env.FIREBASE_PRIVATE_KEY;
  if (!pk) return null;
  return {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: pk.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
  };
}

let initialized = false;
function ensureFirebaseAdmin() {
  if (initialized) return admin.app();

  // Priority 1: GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    initialized = true;
    return admin.app();
  }

  // Priority 2: base64 JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
      const svc = JSON.parse(decoded);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
      initialized = true;
      return admin.app();
    } catch (_) {}
  }

  // Priority 3: raw JSON string
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    initialized = true;
    return admin.app();
  }

  // Priority 4: individual fields
  const svcFromFields = buildServiceAccountFromFields();
  if (svcFromFields) {
    admin.initializeApp({ credential: admin.credential.cert(svcFromFields) });
    initialized = true;
    return admin.app();
  }

  throw new Error('Firebase admin credentials not configured');
}

module.exports = { ensureFirebaseAdmin };


