const admin = require('firebase-admin');
const FcmToken = require('../models/FcmToken.model');
const Notification = require('../models/Notification.model');

class NotificationService {
  /**
   * Send a data message to a single token
   * Automatically removes invalid tokens from database
   * Supports both data-only and notification+data messages
   */
  static async sendDataMessage(token, payload) {
    try {
      // Build message payload
      const message = {
        token,
      };

      // If payload has notification field, include it (for foreground display)
      // Note: notification.icon is NOT valid in FCM notification object
      if (payload.notification) {
        // Create a clean notification object without icon
        const cleanNotification = {
          title: payload.notification.title,
          body: payload.notification.body,
        };
        // Only include image if it exists (not icon)
        if (payload.notification.image) {
          cleanNotification.image = payload.notification.image;
        }
        message.notification = cleanNotification;
      }

      // Always include data (for background handling)
      if (payload.data) {
        message.data = {};
        // Convert all data values to strings (FCM requirement)
        for (const [key, value] of Object.entries(payload.data)) {
          message.data[key] = String(value);
        }
      }

      // Set Android priority for better delivery
      message.android = {
        priority: 'high',
      };

      // Set web push options (icon goes here, not in notification)
      message.webpush = {
        notification: {
          title: payload.notification?.title || payload.data?.title || 'Notification',
          body: payload.notification?.body || payload.data?.body || '',
          icon: '/slog-logo.png', // Icon is valid in webpush.notification
        },
      };

      console.log(`[FCM] 📤 Sending message to token ${token.substring(0, 20)}...`);
      const result = await admin.messaging().send(message);
      console.log(`[FCM] ✅ Message sent successfully: ${result}`);
      return result;
    } catch (err) {
      const code = err?.errorInfo?.code || err?.code;
      
      // List of error codes that indicate token is invalid and should be removed
      const invalidTokenCodes = [
        'messaging/registration-token-not-registered',
        'messaging/invalid-registration-token',
        'messaging/invalid-argument'
      ];

      if (invalidTokenCodes.includes(code)) {
        try {
          const result = await FcmToken.deleteOne({ token });
          if (result.deletedCount > 0) {
            console.log(`[FCM] 🗑️ Removed invalid token: ${token.substring(0, 20)}... (code: ${code})`);
          }
        } catch (deleteErr) {
          console.error(`[FCM] ❌ Failed to delete invalid token:`, deleteErr);
        }
        return null;
      }
      
      // For other errors, throw to be handled by caller
      console.error(`[FCM] ❌ Error sending message:`, err);
      throw err;
    }
  }

  /**
   * Save notification to database for a user
   */
  static async saveNotification(userId, title, body, tag, data = {}, sentBy = null) {
    try {
      const notification = await Notification.create({
        userId,
        title,
        body,
        tag,
        data,
        sentBy,
        read: false
      });
      console.log(`[FCM] 💾 Notification saved to DB for user ${userId}`);
      return notification;
    } catch (err) {
      console.error(`[FCM] ❌ Failed to save notification to DB:`, err);
      // Don't throw - notification sending should continue even if DB save fails
      return null;
    }
  }

  /**
   * Save notifications for multiple users
   */
  static async saveNotificationsForUsers(userIds, title, body, tag, data = {}, sentBy = null) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title,
        body,
        tag,
        data,
        sentBy,
        read: false
      }));
      
      const result = await Notification.insertMany(notifications);
      console.log(`[FCM] 💾 Saved ${result.length} notifications to DB`);
      return result;
    } catch (err) {
      console.error(`[FCM] ❌ Failed to save notifications to DB:`, err);
      return [];
    }
  }

  /**
   * Send data messages to multiple tokens
   * Uses batch sending (multicast) for better performance
   * Automatically cleans up invalid tokens
   * Saves notifications to database
   */
  static async sendDataMessageMultiple(tokens, payloadFactory, userIds = null, sentBy = null) {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    const responses = [];
    const invalidTokens = [];
    
    // Use multicast for batches of up to 500 tokens (FCM limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      try {
        // For multicast, all tokens need the same payload
        // If payloadFactory returns different payloads, we need to send individually
        const firstPayload = payloadFactory(batch[0]);
        const allSamePayload = batch.every(t => {
          const p = payloadFactory(t);
          return JSON.stringify(p.data) === JSON.stringify(firstPayload.data);
        });

        if (allSamePayload && batch.length > 1) {
          // Use multicast for better performance
          try {
            const multicastMessage = {
              tokens: batch,
            };

            // Include notification if available (without icon - icon is not valid in notification object)
            if (firstPayload.notification) {
              const cleanNotification = {
                title: firstPayload.notification.title,
                body: firstPayload.notification.body,
              };
              // Only include image if it exists (not icon)
              if (firstPayload.notification.image) {
                cleanNotification.image = firstPayload.notification.image;
              }
              multicastMessage.notification = cleanNotification;
            }

            // Include data (convert all values to strings)
            if (firstPayload.data) {
              multicastMessage.data = {};
              for (const [key, value] of Object.entries(firstPayload.data)) {
                multicastMessage.data[key] = String(value);
              }
            }

            // Set Android priority
            multicastMessage.android = {
              priority: 'high',
            };

            // Set web push options (icon goes here, not in notification)
            multicastMessage.webpush = {
              notification: {
                title: firstPayload.notification?.title || firstPayload.data?.title || 'Notification',
                body: firstPayload.notification?.body || firstPayload.data?.body || '',
                icon: '/slog-logo.png', // Icon is valid in webpush.notification
              },
            };

            // Use sendMulticast (correct method name in Firebase Admin SDK)
            const multicastResponse = await admin.messaging().sendMulticast(multicastMessage);

            // Process responses
            multicastResponse.responses.forEach((resp, idx) => {
              if (resp.success) {
                responses.push({ token: batch[idx], success: true, messageId: resp.messageId });
              } else {
                const code = resp.error?.code;
                if (code === 'messaging/registration-token-not-registered' || 
                    code === 'messaging/invalid-registration-token') {
                  invalidTokens.push(batch[idx]);
                }
                console.error(`[FCM] ❌ Multicast error for token ${batch[idx].substring(0, 20)}...:`, resp.error?.message);
              }
            });
          } catch (multicastErr) {
            // If multicast fails, fall back to individual sends
            console.warn(`[FCM] ⚠️ Multicast failed, falling back to individual sends:`, multicastErr.message);
            for (const t of batch) {
              try {
                const resp = await NotificationService.sendDataMessage(t, payloadFactory(t));
                if (resp) responses.push({ token: t, success: true, messageId: resp });
              } catch (err) {
                console.error(`[FCM] ❌ Send error for token ${t.substring(0, 20)}...:`, err.message);
              }
            }
          }
        } else {
          // Different payloads - send individually
          for (const t of batch) {
            try {
              const resp = await NotificationService.sendDataMessage(t, payloadFactory(t));
              if (resp) responses.push({ token: t, success: true, messageId: resp });
            } catch (err) {
              console.error(`[FCM] ❌ Send error for token ${t.substring(0, 20)}...:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error(`[FCM] ❌ Batch send error:`, err.message);
      }
    }

    // Clean up invalid tokens in batch
    if (invalidTokens.length > 0) {
      try {
        const deleteResult = await FcmToken.deleteMany({ token: { $in: invalidTokens } });
        console.log(`[FCM] 🗑️ Removed ${deleteResult.deletedCount} invalid tokens`);
      } catch (deleteErr) {
        console.error(`[FCM] ❌ Failed to delete invalid tokens:`, deleteErr);
      }
    }

    // Save notifications to database if userIds provided
    if (userIds && userIds.length > 0 && tokens.length > 0) {
      try {
        const firstPayload = payloadFactory(tokens[0]);
        const title = firstPayload.data?.title || 'Notification';
        const body = firstPayload.data?.body || '';
        const tag = firstPayload.data?.tag || 'default_notification';
        
        // Save notifications for all users
        await NotificationService.saveNotificationsForUsers(
          userIds,
          title,
          body,
          tag,
          firstPayload.data || {},
          sentBy
        );
      } catch (err) {
        console.error(`[FCM] ❌ Failed to save notifications:`, err);
        // Don't fail the whole operation if DB save fails
      }
    }

    return responses;
  }

  /**
   * Clean up stale tokens (not seen in last 90 days)
   */
  static async cleanupStaleTokens(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await FcmToken.deleteMany({
        lastSeenAt: { $lt: cutoffDate }
      });
      
      console.log(`[FCM] 🧹 Cleaned up ${result.deletedCount} stale tokens (older than ${daysOld} days)`);
      return result.deletedCount;
    } catch (err) {
      console.error(`[FCM] ❌ Error cleaning up stale tokens:`, err);
      throw err;
    }
  }
}

module.exports = NotificationService;


