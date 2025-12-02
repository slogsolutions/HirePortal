const express = require('express');
const router = express.Router();
const { upsertToken, sendToUser, adminSend, adminSimple } = require('../controllers/fcm.controller');

// Save or update token
router.post('/fcm/token', upsertToken);

// Send a test notification to user
router.post('/fcm/send/:userId', sendToUser);

// Admin send route (data-only payloads)
router.post('/fcm/admin/send', adminSend);
router.post('/fcm/admin/simple', adminSimple);

module.exports = router;




// New 

// routes/fcm.routes.js
// const express = require('express');
// const router = express.Router();

// const controllerPath = '../controllers/fcm.controller';
// let ctrl;
// try {
//   ctrl = require(controllerPath);
// } catch (err) {
//   console.error(`Failed to require ${controllerPath}:`, err);
//   throw err;
// }

// // destructure handlers
// const { upsertToken, sendToUser, adminSend, adminSimple } = ctrl;

// // validate
// function assertHandler(name, fn) {
//   if (typeof fn !== 'function') {
//     throw new Error(`FATAL: controller '${controllerPath}' is missing export '${name}' or it is not a function. Export keys: ${Object.keys(ctrl).join(', ')}`);
//   }
// }
// assertHandler('upsertToken', upsertToken);
// assertHandler('sendToUser', sendToUser);
// assertHandler('adminSend', adminSend);
// assertHandler('adminSimple', adminSimple);

// // routes
// router.post('/fcm/token', upsertToken);
// router.post('/fcm/send/:userId', sendToUser);
// router.post('/fcm/admin/send', adminSend);
// router.post('/fcm/admin/simple', adminSimple);

// module.exports = router;
