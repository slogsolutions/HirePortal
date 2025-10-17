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

const notificationStore = {};

messaging.onBackgroundMessage((payload) => {
  const userTag = payload.data?.tag || "user_default_notification";
  const messageTitle = payload.data?.title || "New Notification";
  const messageBody = payload.data?.body || "";

  if (notificationStore[userTag]) {
    notificationStore[userTag].count += 1;
    notificationStore[userTag].body = `${notificationStore[userTag].count} new messages`;
    notificationStore[userTag].title = messageTitle;
  } else {
    notificationStore[userTag] = { count: 1, body: messageBody, title: messageTitle };
  }

  const options = {
    body: notificationStore[userTag].body,
    icon: "/slog-logo.png",
    tag: userTag,
    renotify: true,
    data: payload.data
  };

  self.registration.getNotifications({ tag: userTag }).then((existing) => {
    existing.forEach((n) => n.close());
    self.registration.showNotification(notificationStore[userTag].title, options);
  });
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
