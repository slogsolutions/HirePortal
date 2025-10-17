// src/firebase-messaging-sw-register.js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Firebase SW registered:", registration);
    })
    .catch((err) => console.error("SW registration failed:", err));
}
