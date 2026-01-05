# FCM Quick Reference Guide

## 🚀 Quick Start

### **Client-Side Setup**
1. Hook is automatically initialized in `App.jsx` when user logs in
2. Service worker registered in `main.jsx`
3. No manual setup needed!

### **Sending a Notification (Admin)**

#### **Via API**
```bash
POST /api/fcm/admin/send
Content-Type: application/json

{
  "title": "Hello",
  "body": "World",
  "allUsers": true  // or "userId": "123", or "userIds": ["1","2"], or "deviceToken": "token"
}
```

#### **Via UI**
- Navigate to `/notifications-admin` (if route exists)
- Fill in title and body
- Select target (user/users/device/all)
- Click Send

---

## 📍 Key Files

| File | Purpose |
|------|---------|
| `client/src/hooks/useFirebaseMessaging.js` | Token management & foreground notifications |
| `client/public/firebase-messaging-sw.js` | Background notification handler |
| `server/controllers/fcm.controller.js` | API endpoints for sending |
| `server/utils/notification.service.js` | Reusable sending utilities |
| `server/models/FcmToken.model.js` | Token storage schema |

---

## 🔑 API Endpoints

### **1. Save Token**
```http
POST /api/fcm/token
Body: { userId, token, platform }
```
- Called automatically by hook
- Upserts token in database

### **2. Send to User**
```http
POST /api/fcm/send/:userId
Body: { title, body, data }
```
- Uses notification payload (not data-only)
- Sends to all tokens for user

### **3. Admin Send (Data-Only)**
```http
POST /api/fcm/admin/send
Body: { title, body, userId? | userIds? | deviceToken? | allUsers? }
```
- **Recommended**: Uses data-only payload
- Supports multiple targeting options
- Returns `{ success, tokensSent, responses }`

### **4. Admin Simple**
```http
POST /api/fcm/admin/simple
Body: { title, body, userId? | userIds? | deviceToken? | allUsers? }
```
- Same as `adminSend` but uses `NotificationService`
- Cleaner implementation

---

## 📦 Payload Structure

### **Data-Only Message** (Recommended)
```javascript
{
  data: {
    title: "Notification Title",
    body: "Notification Body",
    tag: "user_123_notification"  // For grouping
  }
}
```

### **Notification Payload** (Legacy)
```javascript
{
  notification: {
    title: "Title",
    body: "Body"
  },
  data: {
    // Custom data
  }
}
```

---

## 🏷️ Tag Format

Tags are used for notification grouping/merging:

- **User-specific**: `user_{userId}_notification`
- **Device-specific**: `device_{token}_notification`
- **Default**: `default_notification`

**Behavior**: Notifications with the same tag are merged and show as "X new messages"

---

## 🔄 Notification Flow

### **Foreground (App Open)**
```
FCM Message → onMessage() → Extract title/body/tag → 
Merge by tag → Sonner Toast
```

### **Background (App Closed)**
```
FCM Message → Service Worker → Extract title/body/tag → 
Merge by tag → Browser Notification → User Clicks → Focus App
```

---

## 🐛 Debugging

### **Check Token**
```javascript
// In browser console
localStorage.getItem('fcm_token')
// Returns: { token: "...", userId: "..." }
```

### **Check Service Worker**
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))
```

### **View FCM Token Modal**
- Component: `FcmTokenModal`
- Shows current token and allows manual save

### **Console Logs**
All FCM operations log to console with `[FCM]` prefix:
- `🔐 Requesting notification permission...`
- `✅ Received FCM token: ...`
- `🚀 Sending token to backend...`
- `🔔 Foreground message received!`

---

## ⚙️ Environment Variables

### **Client**
```env
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

### **Server**
```env
# Option 1: File path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Option 2: Base64 encoded JSON
FIREBASE_SERVICE_ACCOUNT_B64=base64-encoded-json

# Option 3: Raw JSON string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Option 4: Individual fields
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
# ... other fields
```

---

## 📊 Database Schema

### **FcmToken Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  token: String (indexed),
  platform: String (enum: ['web', 'android', 'ios']),
  userAgent: String,
  lastSeenAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1, token: 1 }` (unique compound)

---

## ⚠️ Common Issues

### **1. Notifications Not Showing**
- ✅ Check browser notification permission
- ✅ Verify service worker is registered
- ✅ Check console for errors
- ✅ Verify FCM token exists in database

### **2. Token Not Saving**
- ✅ Check user is authenticated
- ✅ Verify API endpoint is accessible
- ✅ Check network tab for failed requests
- ✅ Verify MongoDB connection

### **3. Background Notifications Not Working**
- ✅ Verify `firebase-messaging-sw.js` is in `/public` folder
- ✅ Check service worker registration
- ✅ Verify Firebase config matches client config
- ✅ Check browser console for service worker errors

### **4. Invalid Token Errors**
- ✅ Tokens are automatically cleaned up
- ✅ Check `FcmToken` collection for removed tokens
- ✅ User may need to refresh page to get new token

---

## 🎯 Best Practices

1. **Always use data-only messages** for consistency
2. **Use meaningful tags** for notification grouping
3. **Handle errors gracefully** (already implemented)
4. **Monitor token cleanup** (invalid tokens auto-removed)
5. **Test both foreground and background** scenarios
6. **Use batch sending** for large user lists (future improvement)

---

## 📝 Notes

- **NotificationContext**: Created but not currently used in codebase
- **Token Refresh**: Happens automatically on window focus
- **Multi-Device**: Users can have multiple tokens (different devices)
- **Tag Merging**: Same tag = merged notifications with counter

---

## 🔗 Related Documentation

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

