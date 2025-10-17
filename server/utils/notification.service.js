const admin = require('firebase-admin');
const FcmToken = require('../models/FcmToken.model');

class NotificationService {
  static async sendDataMessage(token, payload) {
    try {
      return await admin.messaging().send({
        token,
        data: payload.data,
      });
    } catch (err) {
      const code = err?.errorInfo?.code || err?.code;
      if (code === 'messaging/registration-token-not-registered') {
        try {
          await FcmToken.deleteOne({ token });
          // eslint-disable-next-line no-console
          console.log(`FCM: Removed invalid token ${token}`);
        } catch (_) {}
        return null;
      }
      throw err;
    }
  }

  static async sendDataMessageMultiple(tokens, payloadFactory) {
    const responses = [];
    for (const t of tokens) {
      try {
        const resp = await NotificationService.sendDataMessage(t, payloadFactory(t));
        if (resp) responses.push(resp);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`FCM send error for token ${t}:`, err.message || err);
      }
    }
    return responses;
  }
}

module.exports = NotificationService;


