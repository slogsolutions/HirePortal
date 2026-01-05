// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyClmwz3de55d07gJqtq-aXlnNmX5-wBDt0",
  authDomain: "hireportal-9eb96.firebaseapp.com",
  projectId: "hireportal-9eb96",
  storageBucket: "hireportal-9eb96.firebasestorage.app",
  messagingSenderId: "1075449951445",
  appId: "1:1075449951445:web:a16720d74096fc84551e5c",
  measurementId: "G-TJFBQ9TPY1"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const userTag = payload.data?.tag || "user_default_notification";
  const messageTitle = payload.data?.title || "New Notification";
  const messageBody = payload.data?.body || "";

  // Show exact message (no merging) - each notification is unique
  const options = {
    body: messageBody,
    icon: "/slog-logo.png",
    tag: `${userTag}_${Date.now()}`, // Unique tag for each notification
    renotify: false, // Don't renotify, show each message separately
    data: payload.data,
    timestamp: Date.now()
  };

  // Show notification directly without closing existing ones
  self.registration.showNotification(messageTitle, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
