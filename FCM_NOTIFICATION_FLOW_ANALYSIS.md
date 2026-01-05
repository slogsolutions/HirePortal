# FCM & Notification Flow - Deep Analysis

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Initialization Flow](#initialization-flow)
3. [Token Registration Flow](#token-registration-flow)
4. [Notification Sending Flow](#notification-sending-flow)
5. [Notification Receiving Flow](#notification-receiving-flow)
6. [Component Breakdown](#component-breakdown)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Key Features & Behaviors](#key-features--behaviors)
9. [Error Handling](#error-handling)
10. [Potential Issues & Improvements](#potential-issues--improvements)

---

## 🏗️ Architecture Overview

The system uses **Firebase Cloud Messaging (FCM)** for push notifications with a dual-layer approach:
- **Client-side**: React app with Firebase SDK (v9+ modular)
- **Server-side**: Node.js/Express with Firebase Admin SDK
- **Service Worker**: Handles background notifications

### Key Components:
```
Client (React)
├── useFirebaseMessaging Hook (Foreground handling)
├── firebase-messaging-sw.js (Background handling)
└── Firebase SDK (Token management)

Server (Node.js)
├── FCM Controller (Token storage & sending)
├── Notification Service (Message sending utilities)
└── Firebase Admin SDK (Server-side messaging)
```

---

## 🚀 Initialization Flow

### 1. **Application Bootstrap** (`main.jsx`)
```javascript
// Service Worker Registration
import './firebase-messaging-sw-register.js'
```
- Registers the service worker at `/firebase-messaging-sw.js`
- Service worker handles background notifications when app is closed/minimized

### 2. **Firebase Client Initialization** (`client/src/firebase.js`)
```javascript
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```
- Initializes Firebase app with config
- Exports messaging instance for token generation

### 3. **Firebase Admin Initialization** (`server/config/firebaseAdmin.js`)
- **Priority-based credential loading**:
  1. `GOOGLE_APPLICATION_CREDENTIALS` env var
  2. `FIREBASE_SERVICE_ACCOUNT_B64` (base64 encoded JSON)
  3. `FIREBASE_SERVICE_ACCOUNT` (raw JSON string)
  4. Individual fields (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, etc.)
- Singleton pattern: Only initializes once

### 4. **Hook Integration** (`App.jsx`)
```javascript
const fcmToken = useFirebaseMessaging(isAuthenticated ? user : null);
```
- Hook only activates when user is authenticated
- Returns FCM token (can be used for debugging)

---

## 🔑 Token Registration Flow

### Step-by-Step Process:

#### **1. User Authentication Check**
```javascript
if (!user || !user.id) {
  console.log("[FCM] ❌ No authenticated user, skipping FCM setup.");
  return;
}
```
- Hook exits early if no authenticated user

#### **2. Permission Request** (`useFirebaseMessaging.js:23-32`)
```javascript
if (Notification.permission !== "granted") {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return;
}
```
- Requests browser notification permission
- Blocks if denied

#### **3. Token Generation** (`useFirebaseMessaging.js:34-38`)
```javascript
const token = await getToken(messaging, {
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
});
```
- Generates FCM token using VAPID key
- Token is unique per browser/device

#### **4. Local Storage Check** (`useFirebaseMessaging.js:40-50`)
```javascript
const savedRaw = localStorage.getItem('fcm_token');
const saved = savedRaw ? JSON.parse(savedRaw) : null;
```
- Checks if token already exists in localStorage
- Format: `{ token: "...", userId: "..." }`

#### **5. Backend Sync Decision** (`useFirebaseMessaging.js:52-53`)
```javascript
const needSendToBackend = !saved || saved.token !== token || saved.userId !== user.id;
```
- Sends to backend if:
  - No saved token exists
  - Token changed (new device/browser)
  - User ID changed (different user logged in)

#### **6. Backend Token Storage** (`useFirebaseMessaging.js:67-72`)
```javascript
await api.post("/fcm/token", {
  userId: user.id,
  token,
  platform: "web",
});
```

#### **7. Database Upsert** (`server/controllers/fcm.controller.js:19-23`)
```javascript
const doc = await FcmToken.findOneAndUpdate(
  { userId, token },
  { platform: platform || 'web', userAgent, lastSeenAt: new Date() },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);
```
- **MongoDB Model** (`FcmToken.model.js`):
  - `userId`: ObjectId reference to User
  - `token`: String (indexed, unique per userId+token combo)
  - `platform`: Enum ['web', 'android', 'ios']
  - `userAgent`: Browser/device info
  - `lastSeenAt`: Last token update timestamp
  - **Unique Index**: `{ userId: 1, token: 1 }`

#### **8. Token Refresh on Focus** (`useFirebaseMessaging.js:134-137`)
```javascript
window.addEventListener("focus", onFocus);
```
- Re-checks token when window regains focus
- Handles token rotation/refresh scenarios

---

## 📤 Notification Sending Flow

### **Admin Send Endpoint** (`POST /fcm/admin/send`)

#### **1. Request Payload** (`NotificationsAdmin.jsx:100-112`)
```javascript
{
  title: "Notification Title",
  body: "Notification Body",
  // Target options (mutually exclusive):
  allUsers: true,                    // Send to all registered tokens
  userId: "user123",                  // Send to specific user
  userIds: ["user1", "user2"],       // Send to multiple users
  deviceToken: "token123"             // Send to specific device
}
```

#### **2. Token Resolution** (`fcm.controller.js:57-77`)
```javascript
if (allUsers) {
  tokens = await FcmToken.find({}).select('token -_id');
} else if (deviceToken) {
  tokens = [deviceToken];
} else if (userId) {
  tokens = await FcmToken.find({ userId }).select('token -_id');
} else if (userIds) {
  tokens = await FcmToken.find({ userId: { $in: userIds } }).select('token -_id');
}
```
- Resolves user IDs to FCM tokens
- Supports multiple targeting strategies

#### **3. Payload Construction** (`fcm.controller.js:101-107`)
```javascript
const payloadFor = (tkn) => ({
  data: {
    title: String(title),
    body: String(body),
    tag: userId ? `user_${userId}_notification` : `device_${tkn}_notification`,
  },
});
```
- **Data-only messages** (not notification payload)
- Tag used for notification grouping/merging

#### **4. Message Sending** (`fcm.controller.js:84-98`)
```javascript
async function sendDataMessage(singleToken, payload) {
  try {
    return await messaging.send({ token: singleToken, data: payload.data });
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      await FcmToken.deleteOne({ token: singleToken });
      return null;
    }
    throw err;
  }
}
```
- Sends individually (not multicast)
- **Automatic cleanup**: Removes invalid tokens
- Error handling for expired/invalid tokens

#### **5. Alternative: Notification Service** (`notification.service.js`)
- Utility class for reusable sending logic
- `sendDataMessage()`: Single token
- `sendDataMessageMultiple()`: Multiple tokens with factory function

#### **6. Alternative Endpoint: `adminSimple`** (`fcm.controller.js:124-163`)
- Uses `NotificationService.sendDataMessageMultiple()`
- Cleaner implementation, same functionality

---

## 📥 Notification Receiving Flow

### **Scenario A: App in Foreground** (Tab Active)

#### **1. Message Listener** (`useFirebaseMessaging.js:89-124`)
```javascript
const unsub = onMessage(messaging, (payload) => {
  // Extract title, body, tag from payload
  const title = payload?.data?.title || payload?.notification?.title || "New Notification";
  const body = payload?.data?.body || payload?.notification?.body || "You have a new update.";
  const tag = payload?.data?.tag || "default_notification";
  
  // Merge notifications by tag
  if (store[tag]) {
    store[tag].count += 1;
    store[tag].body = `${store[tag].count} new messages`;
  } else {
    store[tag] = { count: 1, body };
  }
  
  // Show Sonner toast
  toast(`${title}`, { description: store[tag].body });
});
```

**Key Behaviors:**
- ✅ Extracts title/body from `payload.data` or `payload.notification`
- ✅ **Tag-based grouping**: Notifications with same tag are merged
- ✅ **Counter increment**: Shows "X new messages" for grouped notifications
- ✅ **Sonner toast**: Displays notification in UI
- ✅ **Ref-based storage**: Persists across re-renders

---

### **Scenario B: App in Background** (Tab Minimized/Closed)

#### **1. Service Worker Handler** (`firebase-messaging-sw.js:20-45`)
```javascript
messaging.onBackgroundMessage((payload) => {
  const userTag = payload.data?.tag || "user_default_notification";
  const messageTitle = payload.data?.title || "New Notification";
  const messageBody = payload.data?.body || "";
  
  // Merge notifications by tag
  if (notificationStore[userTag]) {
    notificationStore[userTag].count += 1;
    notificationStore[userTag].body = `${notificationStore[userTag].count} new messages`;
  } else {
    notificationStore[userTag] = { count: 1, body: messageBody, title: messageTitle };
  }
  
  // Close existing notifications with same tag
  self.registration.getNotifications({ tag: userTag }).then((existing) => {
    existing.forEach((n) => n.close());
    // Show new merged notification
    self.registration.showNotification(notificationStore[userTag].title, {
      body: notificationStore[userTag].body,
      icon: "/slog-logo.png",
      tag: userTag,
      renotify: true,
      data: payload.data
    });
  });
});
```

**Key Behaviors:**
- ✅ **Same tag-based merging** as foreground
- ✅ **Replaces existing notifications** with same tag
- ✅ **Custom icon**: `/slog-logo.png`
- ✅ **Renotify**: Vibrates/plays sound even if notification exists

#### **2. Notification Click Handler** (`firebase-messaging-sw.js:47-57`)
```javascript
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      // Open new window if none exists
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
```
- Closes notification on click
- Focuses existing app window or opens new one

---

## 🧩 Component Breakdown

### **Client Components**

#### **1. `useFirebaseMessaging` Hook**
**Location**: `client/src/hooks/useFirebaseMessaging.js`
**Purpose**: Manages FCM token lifecycle and foreground notifications
**Key Features**:
- Token generation & backend sync
- Foreground message listener
- Local storage caching
- Window focus token refresh
- Cleanup on unmount

**State Management**:
- `fcmToken`: Current token (returned)
- `listenerRef`: Unsubscribe function reference
- `notificationStoreRef`: Tag-based notification counter

#### **2. Service Worker**
**Location**: `client/public/firebase-messaging-sw.js`
**Purpose**: Handles background notifications
**Key Features**:
- Background message handler
- Notification display
- Click handling
- Tag-based merging

#### **3. `NotificationsAdmin` Component**
**Location**: `client/src/pages/NotificationsAdmin.jsx`
**Purpose**: Admin UI for sending notifications
**Features**:
- Form for title/body input
- Target selection (user/users/device/all)
- Candidate search & selection
- Send status display
- Response handling

#### **4. `FcmTokenModal` Component**
**Location**: `client/src/components/FcmTokenModal.jsx`
**Purpose**: Debug modal for viewing/saving FCM token
**Features**:
- Displays current token
- Manual save button
- User ID display

#### **5. `NotificationContext`** ⚠️
**Location**: `client/src/context/NotificationContext.jsx`
**Status**: **Created but NOT currently used**
**Purpose**: Intended for managing notification state (unread count, mark as read, etc.)
**Features**:
- `notifications`: Array of notifications
- `unreadCount`: Count of unread notifications
- `addNotification()`: Add notification to state
- `markRead()`: Mark notification as read
- `markAllRead()`: Mark all as read

**Note**: This context is wrapped in `main.jsx` but the `useNotifications()` hook is never called anywhere in the codebase. This appears to be prepared for future use (e.g., notification history/inbox feature) but is not integrated with the FCM flow yet.

---

### **Server Components**

#### **1. FCM Controller**
**Location**: `server/controllers/fcm.controller.js`
**Endpoints**:
- `POST /fcm/token` → `upsertToken()`: Save/update token
- `POST /fcm/send/:userId` → `sendToUser()`: Send to specific user (uses notification payload)
- `POST /fcm/admin/send` → `adminSend()`: Admin send (data-only)
- `POST /fcm/admin/simple` → `adminSimple()`: Simplified admin send

#### **2. Notification Service**
**Location**: `server/utils/notification.service.js`
**Purpose**: Reusable notification sending utilities
**Methods**:
- `sendDataMessage(token, payload)`: Single token
- `sendDataMessageMultiple(tokens, payloadFactory)`: Multiple tokens

#### **3. FCM Token Model**
**Location**: `server/models/FcmToken.model.js`
**Schema**:
```javascript
{
  userId: ObjectId (indexed, required),
  token: String (indexed, required),
  platform: String (enum: ['web', 'android', 'ios']),
  userAgent: String,
  lastSeenAt: Date,
  timestamps: { createdAt, updatedAt }
}
```
**Indexes**:
- `{ userId: 1, token: 1 }` (unique compound)

---

## 🔄 Data Flow Diagrams

### **Token Registration Flow**
```
User Login
    ↓
useFirebaseMessaging Hook Activated
    ↓
Request Notification Permission
    ↓
Generate FCM Token (Firebase SDK)
    ↓
Check LocalStorage
    ↓
Token Changed? → Yes → POST /fcm/token
    ↓                    ↓
    No              MongoDB Upsert
    ↓                    ↓
Use Cached Token    Token Saved ✅
```

### **Notification Sending Flow**
```
Admin UI (NotificationsAdmin)
    ↓
Form Submit → POST /fcm/admin/send
    ↓
Controller: Resolve Tokens (userId → tokens[])
    ↓
For Each Token:
    ↓
Build Payload { data: { title, body, tag } }
    ↓
Firebase Admin SDK: messaging.send()
    ↓
Success? → Yes → Continue
    ↓
    No → Token Invalid? → Delete from DB
    ↓
Return Response { success, tokensSent, responses }
```

### **Notification Receiving Flow**
```
Firebase Cloud Messaging
    ↓
    ├─→ App Foreground? → onMessage() → Sonner Toast
    │
    └─→ App Background? → Service Worker → Browser Notification
                            ↓
                    User Clicks → Focus/Open App
```

---

## ✨ Key Features & Behaviors

### **1. Tag-Based Notification Merging**
- **Purpose**: Prevents notification spam
- **Implementation**: Both foreground and background use tag-based counters
- **Tag Format**: `user_{userId}_notification` or `device_{token}_notification`
- **Behavior**: Multiple notifications with same tag show as "X new messages"

### **2. Token Management**
- **Automatic Cleanup**: Invalid tokens removed from DB
- **Multi-Device Support**: Users can have multiple tokens (different devices)
- **Token Refresh**: Re-checks on window focus
- **Local Caching**: Reduces unnecessary backend calls

### **3. Dual Notification Handling**
- **Foreground**: Custom UI (Sonner toast)
- **Background**: Native browser notifications
- **Consistent Behavior**: Same merging logic in both

### **4. Error Handling**
- **Invalid Tokens**: Automatically removed
- **Permission Denied**: Graceful degradation
- **Network Errors**: Logged, doesn't crash app
- **Missing User**: Hook exits early

### **5. Admin Features**
- **Multiple Targeting**: Single user, multiple users, device token, all users
- **Candidate Search**: UI for selecting users
- **Response Feedback**: Shows success/failure counts

---

## ⚠️ Error Handling

### **Client-Side Errors**

#### **1. Permission Denied**
```javascript
if (permission !== "granted") {
  console.log("[FCM] 🚫 Notification permission denied.");
  return; // Hook exits, no token generated
}
```

#### **2. Token Generation Failure**
```javascript
catch (err) {
  console.error("[FCM] ❌ Error requesting token:", err);
  // Hook continues, but no token saved
}
```

#### **3. Backend Sync Failure**
```javascript
catch (err) {
  console.error("[FCM] ❌ Failed to save token to backend:", err);
  // Token still saved locally, will retry on next focus
}
```

### **Server-Side Errors**

#### **1. Invalid Token**
```javascript
if (err.code === 'messaging/registration-token-not-registered') {
  await FcmToken.deleteOne({ token: singleToken });
  return null; // Token removed, continue with others
}
```

#### **2. Missing Credentials**
```javascript
throw new Error('Firebase admin credentials not configured');
```

#### **3. No Tokens Found**
```javascript
if (!tokens.length) return res.status(404).json({ message: 'No tokens found for target' });
```

---

## 🔍 Potential Issues & Improvements

### **Current Issues**

#### **1. Inconsistent Payload Format**
- `adminSend()` uses data-only messages
- `sendToUser()` uses notification payload
- **Impact**: Different handling in foreground vs background
- **Fix**: Standardize on data-only messages

#### **2. No Batch Sending**
- Currently sends one-by-one in loop
- **Impact**: Slow for large user lists
- **Fix**: Use `sendMulticast()` for batches (max 500 tokens)

#### **3. Service Worker Version**
- Uses Firebase v9 compat mode
- **Impact**: Larger bundle size
- **Fix**: Migrate to modular v9+ API

#### **4. No Token Expiration**
- Tokens never expire in DB
- **Impact**: Accumulation of stale tokens
- **Fix**: Add TTL index or cleanup job

#### **5. Missing Notification Persistence**
- Notifications not stored in DB
- **Impact**: No notification history
- **Fix**: Add Notification model, store on send

#### **6. No Retry Logic**
- Failed sends not retried
- **Impact**: Temporary failures lost
- **Fix**: Add queue system (e.g., Bull/BullMQ)

#### **7. Tag Collision Risk**
- Device token used in tag when userId not provided
- **Impact**: Potential tag collisions
- **Fix**: Always use userId in tag, fallback to UUID

### **Recommended Improvements**

#### **1. Batch Sending**
```javascript
// Instead of loop
for (const t of tokens) {
  await sendDataMessage(t, payloadFor(t));
}

// Use multicast (max 500)
const batches = chunk(tokens, 500);
for (const batch of batches) {
  await admin.messaging().sendMulticast({
    tokens: batch,
    data: { title, body, tag }
  });
}
```

#### **2. Notification History**
```javascript
// Store notification in DB
const notification = await Notification.create({
  userId,
  title,
  body,
  tag,
  sentAt: new Date(),
  tokensSent: responses.length
});
```

#### **3. Token Cleanup Job**
```javascript
// Cron job to remove stale tokens
setInterval(async () => {
  const staleDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  await FcmToken.deleteMany({ lastSeenAt: { $lt: staleDate } });
}, 24 * 60 * 60 * 1000); // Daily
```

#### **4. Retry Queue**
```javascript
// Using BullMQ
const notificationQueue = new Queue('notifications');
notificationQueue.add('send', { tokens, payload }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

#### **5. Analytics**
- Track notification open rates
- Track token registration rates
- Track delivery failures
- Dashboard for monitoring

---

## 📊 Summary

### **Strengths**
✅ Clean separation of concerns  
✅ Tag-based notification merging  
✅ Automatic token cleanup  
✅ Multi-device support  
✅ Comprehensive error handling  
✅ Admin UI for sending  

### **Weaknesses**
⚠️ No batch sending (performance)  
⚠️ No notification history  
⚠️ No retry mechanism  
⚠️ Inconsistent payload formats  
⚠️ No analytics/monitoring  

### **Architecture Quality**
- **Client**: ⭐⭐⭐⭐ (4/5) - Well-structured hook, good error handling
- **Server**: ⭐⭐⭐ (3/5) - Functional but could use optimization
- **Service Worker**: ⭐⭐⭐⭐ (4/5) - Solid implementation, good merging logic

---

## 🎯 Conclusion

The FCM implementation is **production-ready** with solid fundamentals:
- Proper token management
- Dual notification handling (foreground/background)
- Tag-based merging to prevent spam
- Automatic cleanup of invalid tokens

**Priority Improvements**:
1. Implement batch sending for performance
2. Add notification history/storage
3. Standardize payload format
4. Add retry mechanism for failed sends

The codebase demonstrates good understanding of FCM patterns and web push notifications.

