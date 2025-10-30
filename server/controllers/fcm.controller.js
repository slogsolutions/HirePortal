// controllers/fcm.controller.js
const asyncHandler = require('express-async-handler');
const admin = require('firebase-admin');
const { ensureFirebaseAdmin } = require('../config/firebaseAdmin');
const FcmToken = require('../models/FcmToken.model');

// Initialize firebase-admin lazily
function ensureAdminInitialized() {
  ensureFirebaseAdmin();
}

/**
 * Normalize payload incoming shapes to { notification?: {title,body}, data: {} }
 */
function normalizePayload(payload) {
  if (!payload) return { notification: undefined, data: {} };
  const out = { notification: undefined, data: {} };
  if (payload.notification) out.notification = payload.notification;
  if (payload.data) out.data = payload.data || {};
  if (!out.notification && (payload.title || payload.body)) {
    out.notification = { title: payload.title || '', body: payload.body || '' };
  }
  if (!out.data) out.data = {};
  return out;
}

/**
 * Robust sender that feature-detects available firebase-admin messaging methods.
 * - tokens: string[]
 * - makePayload(token) => { notification?, data? } or { title, body, ... }
 * - messaging: admin.messaging()
 */
async function sendBatchTokens(tokens, makePayload, messaging) {
  const result = { totalRequested: 0, totalSent: 0, batches: [], removedTokens: [] };
  if (!Array.isArray(tokens) || tokens.length === 0) return result;

  // dedupe + filter
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  if (!uniqueTokens.length) return result;
  result.totalRequested = uniqueTokens.length;

  // feature detect / mode selection
  const forcedMode = (process.env.FCM_SEND_MODE || 'auto').toString();
  const hasSendEachForMulticast = typeof messaging.sendEachForMulticast === 'function';
  const hasSendAll = typeof messaging.sendAll === 'function';
  const hasSendMulticast = typeof messaging.sendMulticast === 'function';
  const hasSend = typeof messaging.send === 'function';

  let mode = 'auto';
  if (forcedMode !== 'auto') mode = forcedMode;
  else {
    if (hasSendEachForMulticast) mode = 'sendEachForMulticast';
    else if (hasSendAll) mode = 'sendAll';
    else if (hasSendMulticast) mode = 'sendMulticast';
    else if (hasSend) mode = 'sendOneByOne';
    else throw new Error('No FCM send method available in firebase-admin Messaging instance');
  }

  const BATCH_SIZE = 500;
  const batches = [];
  for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
    batches.push(uniqueTokens.slice(i, i + BATCH_SIZE));
  }

  const removedSet = new Set();
  let totalSent = 0;

  async function removeToken(tok) {
    try {
      await FcmToken.deleteMany({ token: tok });
      removedSet.add(tok);
      // eslint-disable-next-line no-console
      console.log(`FCM: removed invalid token ${tok}`);
    } catch (e) {
      // ignore deletion errors
    }
  }

  for (const batchTokens of batches) {
    const payloads = batchTokens.map((t) => normalizePayload(makePayload(t)));

    if (mode === 'sendEachForMulticast') {
      const messages = batchTokens.map((tkn, idx) => {
        const p = payloads[idx];
        const msg = { token: tkn };
        if (p.notification) msg.notification = p.notification;
        if (p.data && Object.keys(p.data).length) msg.data = p.data;
        return msg;
      });

      try {
        const resp = await messaging.sendEachForMulticast(messages);
        const responsesSummary = resp.responses.map((r, idx) => {
          const token = batchTokens[idx];
          if (r.success) {
            totalSent++;
            return { token, success: true };
          } else {
            const code = r.error?.code || r.error?.errorInfo?.code || null;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
              removeToken(token).catch(() => {});
            }
            return { token, success: false, error: r.error?.message || String(r.error) };
          }
        });

        result.batches.push({
          ok: true,
          batchSize: batchTokens.length,
          successCount: resp.successCount,
          failureCount: resp.failureCount,
          responsesSummary
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('FCM sendEachForMulticast error:', err);
        result.batches.push({ ok: false, error: String(err), batchSize: batchTokens.length });
      }
      continue;
    }

    if (mode === 'sendAll') {
      const messages = batchTokens.map((tkn, idx) => {
        const p = payloads[idx];
        const msg = { token: tkn };
        if (p.notification) msg.notification = p.notification;
        if (p.data && Object.keys(p.data).length) msg.data = p.data;
        return msg;
      });

      try {
        const resp = await messaging.sendAll(messages);
        const responsesSummary = resp.responses.map((r, idx) => {
          const token = batchTokens[idx];
          if (r.success) {
            totalSent++;
            return { token, success: true };
          } else {
            const code = r.error?.code || r.error?.errorInfo?.code || null;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
              removeToken(token).catch(() => {});
            }
            return { token, success: false, error: r.error?.message || String(r.error) };
          }
        });

        result.batches.push({
          ok: true,
          batchSize: batchTokens.length,
          successCount: resp.successCount,
          failureCount: resp.failureCount,
          responsesSummary
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('FCM sendAll error:', err);
        result.batches.push({ ok: false, error: String(err), batchSize: batchTokens.length });
      }
      continue;
    }

    if (mode === 'sendMulticast') {
      // merge payloads best-effort into a single multicast message
      const merged = { notification: undefined, data: {} };
      for (const p of payloads) {
        if (p.notification && !merged.notification) merged.notification = p.notification;
        merged.data = { ...merged.data, ...(p.data || {}) };
      }
      const multicast = { tokens: batchTokens };
      if (merged.notification) multicast.notification = merged.notification;
      if (merged.data && Object.keys(merged.data).length) multicast.data = merged.data;

      try {
        const resp = await messaging.sendMulticast(multicast);
        for (let i = 0; i < resp.responses.length; i++) {
          const r = resp.responses[i];
          const token = batchTokens[i];
          if (r.success) totalSent++;
          else {
            const code = r.error?.code || r.error?.errorInfo?.code || null;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
              removeToken(token).catch(() => {});
            }
          }
        }

        result.batches.push({
          ok: true,
          batchSize: batchTokens.length,
          successCount: resp.successCount,
          failureCount: resp.failureCount,
          responsesSummary: resp.responses.map((r, idx) => ({
            token: batchTokens[idx],
            success: !!r.success,
            error: r.success ? null : (r.error?.message || String(r.error))
          }))
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('FCM sendMulticast error:', err);
        result.batches.push({ ok: false, error: String(err), batchSize: batchTokens.length });
      }
      continue;
    }

    // fallback one-by-one (with small concurrency)
    if (mode === 'sendOneByOne') {
      const concurrency = 10;
      const queue = [...batchTokens];
      const worker = async () => {
        while (queue.length) {
          const tkn = queue.shift();
          const p = normalizePayload(makePayload(tkn));
          const msg = { token: tkn };
          if (p.notification) msg.notification = p.notification;
          if (p.data && Object.keys(p.data).length) msg.data = p.data;
          try {
            await messaging.send(msg);
            totalSent++;
          } catch (err) {
            const code = err?.code || err?.errorInfo?.code || null;
            if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
              await removeToken(tkn);
            } else {
              // eslint-disable-next-line no-console
              console.error('FCM send error for token', tkn, err);
            }
          }
        }
      };
      await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
      result.batches.push({ ok: true, batchSize: batchTokens.length, successCount: totalSent, failureCount: batchTokens.length - totalSent });
      continue;
    }

    throw new Error(`Unknown FCM send mode: ${mode}`);
  } // end batches loop

  result.totalSent = totalSent;
  result.removedTokens = Array.from(removedSet);
  return result;
}

/* -------------------------
  upsertToken
--------------------------*/
exports.upsertToken = asyncHandler(async (req, res) => {
  const { userId, token, platform } = req.body;
  if (!userId || !token) return res.status(400).json({ message: 'userId and token are required' });

  const userAgent = req.headers['user-agent'] || '';
  const doc = await FcmToken.findOneAndUpdate(
    { userId, token },
    { platform: platform || 'web', userAgent, lastSeenAt: new Date() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ message: 'token saved', data: doc });
});

/* -------------------------
  sendToUser (POST /fcm/send/:userId)
--------------------------*/
exports.sendToUser = asyncHandler(async (req, res) => {
  ensureAdminInitialized();
  const { userId } = req.params;
  const { title, body, data } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  const docs = await FcmToken.find({ userId }).select('token -_id').lean();
  if (!docs.length) return res.status(404).json({ message: 'No tokens for user' });

  const tokens = docs.map(d => d.token);
  const messaging = admin.messaging();

  const result = await sendBatchTokens(tokens, (tkn) => ({
    notification: title || body ? { title: title || 'Notification', body: body || '' } : undefined,
    data: data || {}
  }), messaging);

  return res.json({ success: true, userId, ...result });
});

/* -------------------------
  adminSend (POST /fcm/admin/send)
  Accepts: { title, body, userId, userIds, deviceToken, allUsers }
--------------------------*/
exports.adminSend = asyncHandler(async (req, res) => {
  ensureAdminInitialized();
  const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

  async function getTokensByUserId(id) {
    const docs = await FcmToken.find({ userId: id }).select('token -_id').lean();
    return docs.map(d => d.token);
  }

  const resolved = [];
  const skipped = [];
  let allTokens = [];
  const tokenToUserIds = {};

  if (allUsers) {
    const docs = await FcmToken.find({}).select('token userId -_id').lean();
    for (const d of docs) {
      const t = d.token;
      const uid = d.userId ? String(d.userId) : null;
      allTokens.push(t);
      tokenToUserIds[t] = tokenToUserIds[t] || new Set();
      if (uid) tokenToUserIds[t].add(uid);
    }
    const byUser = {};
    for (const d of docs) {
      const uid = d.userId ? String(d.userId) : null;
      if (!uid) continue;
      byUser[uid] = byUser[uid] || new Set();
      byUser[uid].add(d.token);
    }
    for (const [uid, toks] of Object.entries(byUser)) {
      resolved.push({ userId: uid, tokens: Array.from(toks), count: toks.size });
    }
  } else if (deviceToken) {
    allTokens = [String(deviceToken)];
  } else if (userId) {
    const tks = await getTokensByUserId(userId);
    if (!tks.length) return res.status(404).json({ message: 'No tokens for user', userId });
    resolved.push({ userId: String(userId), tokens: tks, count: tks.length });
    for (const t of tks) {
      allTokens.push(t);
      tokenToUserIds[t] = tokenToUserIds[t] || new Set();
      tokenToUserIds[t].add(String(userId));
    }
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    for (const uidRaw of userIds) {
      const uid = String(uidRaw);
      const tks = await getTokensByUserId(uid);
      if (tks.length) {
        resolved.push({ userId: uid, tokens: tks, count: tks.length });
        for (const t of tks) {
          allTokens.push(t);
          tokenToUserIds[t] = tokenToUserIds[t] || new Set();
          tokenToUserIds[t].add(uid);
        }
      } else {
        skipped.push({ userId: uid });
      }
    }
  } else {
    return res.status(400).json({ message: 'No target specified' });
  }

  const uniqueTokens = Array.from(new Set(allTokens));
  if (!uniqueTokens.length) {
    if (skipped.length) return res.status(200).json({ success: false, message: 'No tokens found for provided userIds', skipped });
    return res.status(404).json({ message: 'No tokens found for target' });
  }

  const messaging = admin.messaging();

  const result = await sendBatchTokens(uniqueTokens, (tkn) => {
    const maybeUid = tokenToUserIds[tkn] ? Array.from(tokenToUserIds[tkn])[0] : null;
    return {
      data: {
        title: String(title),
        body: String(body),
        tag: maybeUid ? `user_${maybeUid}_notification` : `device_${tkn}_notification`
      }
    };
  }, messaging);

  return res.json({
    success: true,
    tokensRequested: result.totalRequested,
    tokensSent: result.totalSent,
    batches: result.batches,
    resolved,
    skipped,
    removedTokens: result.removedTokens
  });
});

/* -------------------------
  adminSimple (keeps NotificationService usage)
--------------------------*/
exports.adminSimple = asyncHandler(async (req, res) => {
  ensureAdminInitialized();
  const NotificationService = require('../utils/notification.service');

  const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

  let tokens = [];
  async function getTokensByUserId(id) {
    const docs = await FcmToken.find({ userId: id }).select('token -_id');
    return docs.map(d => d.token);
  }

  if (allUsers) {
    const docs = await FcmToken.find({}).select('token -_id');
    tokens = docs.map(d => d.token);
  } else if (deviceToken) {
    tokens = [deviceToken];
  } else if (userId) {
    tokens = await getTokensByUserId(userId);
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    const docs = await FcmToken.find({ userId: { $in: userIds } }).select('token -_id');
    tokens = docs.map(d => d.token);
  } else {
    return res.status(400).json({ message: 'No target specified' });
  }

  if (!tokens.length) return res.status(404).json({ message: 'No tokens found for target' });

  const responses = await NotificationService.sendDataMessageMultiple(tokens, (tkn) => ({
    data: {
      title: String(title),
      body: String(body),
      tag: userId ? `user_${userId}_notification` : `device_${tkn}_notification`,
    },
  }));

  return res.json({ success: true, tokensSent: responses.length, responses });
});

/* Ensure require() returns a deterministic object */
module.exports = {
  upsertToken: exports.upsertToken,
  sendToUser: exports.sendToUser,
  adminSend: exports.adminSend,
  adminSimple: exports.adminSimple
};




















// //New but sendMultiple error occuring 
// // controllers/fcm.controller.js
// const asyncHandler = require('express-async-handler');
// const admin = require('firebase-admin');
// const { ensureFirebaseAdmin } = require('../config/firebaseAdmin');
// const FcmToken = require('../models/FcmToken.model');

// // Initialize firebase-admin lazily
// function ensureAdminInitialized() {
//   ensureFirebaseAdmin();
// }

// /**
//  * Normalize payload incoming shapes to { notification?: {title,body}, data: {} }
//  */
// function normalizePayload(payload) {
//   if (!payload) return { notification: undefined, data: {} };
//   const out = { notification: undefined, data: {} };
//   if (payload.notification) out.notification = payload.notification;
//   if (payload.data) out.data = payload.data || {};
//   if (!out.notification && (payload.title || payload.body)) {
//     out.notification = { title: payload.title || '', body: payload.body || '' };
//   }
//   if (!out.data) out.data = {};
//   return out;
// }

// /**
//  * Robust sender that feature-detects available firebase-admin messaging methods.
//  * - tokens: string[]
//  * - makePayload(token) => { notification?, data? } or { title, body, ... }
//  * - messaging: admin.messaging()
//  */
// async function sendBatchTokens(tokens, makePayload, messaging) {
//   const result = { totalRequested: 0, totalSent: 0, batches: [], removedTokens: [] };
//   if (!Array.isArray(tokens) || tokens.length === 0) return result;

//   // dedupe + filter
//   const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
//   if (!uniqueTokens.length) return result;
//   result.totalRequested = uniqueTokens.length;

//   // feature detect / mode selection
//   const forcedMode = (process.env.FCM_SEND_MODE || 'auto').toString();
//   const hasSendEachForMulticast = typeof messaging.sendEachForMulticast === 'function';
//   const hasSendAll = typeof messaging.sendAll === 'function';
//   const hasSendMulticast = typeof messaging.sendMulticast === 'function';
//   const hasSend = typeof messaging.send === 'function';

//   let mode = 'auto';
//   if (forcedMode !== 'auto') mode = forcedMode;
//   else {
//     if (hasSendEachForMulticast) mode = 'sendEachForMulticast';
//     else if (hasSendAll) mode = 'sendAll';
//     else if (hasSendMulticast) mode = 'sendMulticast';
//     else if (hasSend) mode = 'sendOneByOne';
//     else throw new Error('No FCM send method available in firebase-admin Messaging instance');
//   }

//   const BATCH_SIZE = 500;
//   const batches = [];
//   for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
//     batches.push(uniqueTokens.slice(i, i + BATCH_SIZE));
//   }

//   const removedSet = new Set();
//   let totalSent = 0;

//   async function removeToken(tok) {
//     try {
//       await FcmToken.deleteMany({ token: tok });
//       removedSet.add(tok);
//       // eslint-disable-next-line no-console
//       console.log(`FCM: removed invalid token ${tok}`);
//     } catch (e) {
//       // ignore deletion errors
//     }
//   }

//   for (const batchTokens of batches) {
//     const payloads = batchTokens.map((t) => normalizePayload(makePayload(t)));

//     if (mode === 'sendEachForMulticast') {
//       const messages = batchTokens.map((tkn, idx) => {
//         const p = payloads[idx];
//         const msg = { token: tkn };
//         if (p.notification) msg.notification = p.notification;
//         if (p.data && Object.keys(p.data).length) msg.data = p.data;
//         return msg;
//       });

//       try {
//         const resp = await messaging.sendEachForMulticast(messages);
//         const responsesSummary = resp.responses.map((r, idx) => {
//           const token = batchTokens[idx];
//           if (r.success) {
//             totalSent++;
//             return { token, success: true };
//           } else {
//             const code = r.error?.code || r.error?.errorInfo?.code || null;
//             if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
//               removeToken(token).catch(() => {});
//             }
//             return { token, success: false, error: r.error?.message || String(r.error) };
//           }
//         });

//         result.batches.push({
//           ok: true,
//           batchSize: batchTokens.length,
//           successCount: resp.successCount,
//           failureCount: resp.failureCount,
//           responsesSummary
//         });
//       } catch (err) {
//         // eslint-disable-next-line no-console
//         console.error('FCM sendEachForMulticast error:', err);
//         result.batches.push({ ok: false, error: String(err), batchSize: batchTokens.length });
//       }
//       continue;
//     }

//     if (mode === 'sendAll') {
//       const messages = batchTokens.map((tkn, idx) => {
//         const p = payloads[idx];
//         const msg = { token: tkn };
//         if (p.notification) msg.notification = p.notification;
//         if (p.data && Object.keys(p.data).length) msg.data = p.data;
//         return msg;
//       });

//       try {
//         const resp = await messaging.sendAll(messages);
//         const responsesSummary = resp.responses.map((r, idx) => {
//           const token = batchTokens[idx];
//           if (r.success) {
//             totalSent++;
//             return { token, success: true };
//           } else {
//             const code = r.error?.code || r.error?.errorInfo?.code || null;
//             if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
//               removeToken(token).catch(() => {});
//             }
//             return { token, success: false, error: r.error?.message || String(r.error) };
//           }
//         });

//         result.batches.push({
//           ok: true,
//           batchSize: batchTokens.length,
//           successCount: resp.successCount,
//           failureCount: resp.failureCount,
//           responsesSummary
//         });
//       } catch (err) {
//         // eslint-disable-next-line no-console
//         console.error('FCM sendAll error:', err);
//         result.batches.push({ ok: false, error: String(err), batchSize: batchTokens.length });
//       }
//       continue;
//     }

//     if (mode === 'sendMulticast') {
//       // merge payloads best-effort into a single multicast message
//       const merged = { notification: undefined, data: {} };
//       for (const p of payloads) {
//         if (p.notification && !merged.notification) merged.notification = p.notification;
//         merged.data = { ...merged.data, ...(p.data || {}) };
//       }
//       const multicast = { tokens: batchTokens };
//       if (merged.notification) multicast.notification = merged.notification;
//       if (merged.data && Object.keys(merged.data).length) multicast.data = merged.data;

//       try {
//         const resp = await messaging.sendMulticast(multicast);
//         for (let i = 0; i < resp.responses.length; i++) {
//           const r = resp.responses[i];
//           const token = batchTokens[i];
//           if (r.success) totalSent++;
//           else {
//             const code = r.error?.code || r.error?.errorInfo?.code || null;
//             if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
//               removeToken(token).catch(() => {});
//             }
//           }
//         }

//         result.batches.push({
//           ok: true,
//           batchSize: batchTokens.length,
//           successCount: resp.successCount,
//           failureCount: resp.failureCount,
//           responsesSummary: resp.responses.map((r, idx) => ({
//             token: batchTokens[idx],
//             success: !!r.success,
//             error: r.success ? null : (r.error?.message || String(r.error))
//           }))
//         });
//       } catch (err) {
//         // eslint-disable-next-line no-console
//         console.error('FCM sendMulticast error:', err);
//         result.batches.push({ ok: false, error: String(err), batchSize: batchTokens.length });
//       }
//       continue;
//     }

//     // fallback one-by-one (with small concurrency)
//     if (mode === 'sendOneByOne') {
//       const concurrency = 10;
//       const queue = [...batchTokens];
//       const worker = async () => {
//         while (queue.length) {
//           const tkn = queue.shift();
//           const p = normalizePayload(makePayload(tkn));
//           const msg = { token: tkn };
//           if (p.notification) msg.notification = p.notification;
//           if (p.data && Object.keys(p.data).length) msg.data = p.data;
//           try {
//             await messaging.send(msg);
//             totalSent++;
//           } catch (err) {
//             const code = err?.code || err?.errorInfo?.code || null;
//             if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
//               await removeToken(tkn);
//             } else {
//               // eslint-disable-next-line no-console
//               console.error('FCM send error for token', tkn, err);
//             }
//           }
//         }
//       };
//       await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
//       result.batches.push({ ok: true, batchSize: batchTokens.length, successCount: totalSent, failureCount: batchTokens.length - totalSent });
//       continue;
//     }

//     throw new Error(`Unknown FCM send mode: ${mode}`);
//   } // end batches loop

//   result.totalSent = totalSent;
//   result.removedTokens = Array.from(removedSet);
//   return result;
// }

// /* -------------------------
//   upsertToken
// --------------------------*/
// exports.upsertToken = asyncHandler(async (req, res) => {
//   const { userId, token, platform } = req.body;
//   if (!userId || !token) return res.status(400).json({ message: 'userId and token are required' });

//   const userAgent = req.headers['user-agent'] || '';
//   const doc = await FcmToken.findOneAndUpdate(
//     { userId, token },
//     { platform: platform || 'web', userAgent, lastSeenAt: new Date() },
//     { new: true, upsert: true, setDefaultsOnInsert: true }
//   );

//   res.json({ message: 'token saved', data: doc });
// });

// /* -------------------------
//   sendToUser (POST /fcm/send/:userId)
// --------------------------*/
// exports.sendToUser = asyncHandler(async (req, res) => {
//   ensureAdminInitialized();
//   const { userId } = req.params;
//   const { title, body, data } = req.body;
//   if (!userId) return res.status(400).json({ message: 'userId required' });

//   const docs = await FcmToken.find({ userId }).select('token -_id').lean();
//   if (!docs.length) return res.status(404).json({ message: 'No tokens for user' });

//   const tokens = docs.map(d => d.token);
//   const messaging = admin.messaging();

//   const result = await sendBatchTokens(tokens, (tkn) => ({
//     notification: title || body ? { title: title || 'Notification', body: body || '' } : undefined,
//     data: data || {}
//   }), messaging);

//   return res.json({ success: true, userId, ...result });
// });

// /* -------------------------
//   adminSend (POST /fcm/admin/send)
//   Accepts: { title, body, userId, userIds, deviceToken, allUsers }
// --------------------------*/
// exports.adminSend = asyncHandler(async (req, res) => {
//   ensureAdminInitialized();
//   const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
//   if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

//   async function getTokensByUserId(id) {
//     const docs = await FcmToken.find({ userId: id }).select('token -_id').lean();
//     return docs.map(d => d.token);
//   }

//   const resolved = [];
//   const skipped = [];
//   let allTokens = [];
//   const tokenToUserIds = {};

//   if (allUsers) {
//     const docs = await FcmToken.find({}).select('token userId -_id').lean();
//     for (const d of docs) {
//       const t = d.token;
//       const uid = d.userId ? String(d.userId) : null;
//       allTokens.push(t);
//       tokenToUserIds[t] = tokenToUserIds[t] || new Set();
//       if (uid) tokenToUserIds[t].add(uid);
//     }
//     const byUser = {};
//     for (const d of docs) {
//       const uid = d.userId ? String(d.userId) : null;
//       if (!uid) continue;
//       byUser[uid] = byUser[uid] || new Set();
//       byUser[uid].add(d.token);
//     }
//     for (const [uid, toks] of Object.entries(byUser)) {
//       resolved.push({ userId: uid, tokens: Array.from(toks), count: toks.size });
//     }
//   } else if (deviceToken) {
//     allTokens = [String(deviceToken)];
//   } else if (userId) {
//     const tks = await getTokensByUserId(userId);
//     if (!tks.length) return res.status(404).json({ message: 'No tokens for user', userId });
//     resolved.push({ userId: String(userId), tokens: tks, count: tks.length });
//     for (const t of tks) {
//       allTokens.push(t);
//       tokenToUserIds[t] = tokenToUserIds[t] || new Set();
//       tokenToUserIds[t].add(String(userId));
//     }
//   } else if (Array.isArray(userIds) && userIds.length > 0) {
//     for (const uidRaw of userIds) {
//       const uid = String(uidRaw);
//       const tks = await getTokensByUserId(uid);
//       if (tks.length) {
//         resolved.push({ userId: uid, tokens: tks, count: tks.length });
//         for (const t of tks) {
//           allTokens.push(t);
//           tokenToUserIds[t] = tokenToUserIds[t] || new Set();
//           tokenToUserIds[t].add(uid);
//         }
//       } else {
//         skipped.push({ userId: uid });
//       }
//     }
//   } else {
//     return res.status(400).json({ message: 'No target specified' });
//   }

//   const uniqueTokens = Array.from(new Set(allTokens));
//   if (!uniqueTokens.length) {
//     if (skipped.length) return res.status(200).json({ success: false, message: 'No tokens found for provided userIds', skipped });
//     return res.status(404).json({ message: 'No tokens found for target' });
//   }

//   const messaging = admin.messaging();

//   const result = await sendBatchTokens(uniqueTokens, (tkn) => {
//     const maybeUid = tokenToUserIds[tkn] ? Array.from(tokenToUserIds[tkn])[0] : null;
//     return {
//       data: {
//         title: String(title),
//         body: String(body),
//         tag: maybeUid ? `user_${maybeUid}_notification` : `device_${tkn}_notification`
//       }
//     };
//   }, messaging);

//   return res.json({
//     success: true,
//     tokensRequested: result.totalRequested,
//     tokensSent: result.totalSent,
//     batches: result.batches,
//     resolved,
//     skipped,
//     removedTokens: result.removedTokens
//   });
// });

// /* -------------------------
//   adminSimple (keeps NotificationService usage)
// --------------------------*/
// exports.adminSimple = asyncHandler(async (req, res) => {
//   ensureAdminInitialized();
//   const NotificationService = require('../utils/notification.service');

//   const { title, body, userId, userIds, deviceToken, allUsers } = req.body;
//   if (!title || !body) return res.status(400).json({ message: 'Missing title or body' });

//   let tokens = [];
//   async function getTokensByUserId(id) {
//     const docs = await FcmToken.find({ userId: id }).select('token -_id');
//     return docs.map(d => d.token);
//   }

//   if (allUsers) {
//     const docs = await FcmToken.find({}).select('token -_id');
//     tokens = docs.map(d => d.token);
//   } else if (deviceToken) {
//     tokens = [deviceToken];
//   } else if (userId) {
//     tokens = await getTokensByUserId(userId);
//   } else if (Array.isArray(userIds) && userIds.length > 0) {
//     const docs = await FcmToken.find({ userId: { $in: userIds } }).select('token -_id');
//     tokens = docs.map(d => d.token);
//   } else {
//     return res.status(400).json({ message: 'No target specified' });
//   }

//   if (!tokens.length) return res.status(404).json({ message: 'No tokens found for target' });

//   const responses = await NotificationService.sendDataMessageMultiple(tokens, (tkn) => ({
//     data: {
//       title: String(title),
//       body: String(body),
//       tag: userId ? `user_${userId}_notification` : `device_${tkn}_notification`,
//     },
//   }));

//   return res.json({ success: true, tokensSent: responses.length, responses });
// });

// /* Ensure require() returns a deterministic object */
// module.exports = {
//   upsertToken: exports.upsertToken,
//   sendToUser: exports.sendToUser,
//   adminSend: exports.adminSend,
//   adminSimple: exports.adminSimple
// };
