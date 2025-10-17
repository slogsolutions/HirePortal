// src/hooks/useFirebaseMessaging.js
import { useEffect, useRef, useState } from "react";
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import api from "../api/axios";

const useFirebaseMessaging = (user) => {
  const [fcmToken, setFcmToken] = useState(null);
  const listenerRef = useRef({});
  const notificationStoreRef = useRef({});

  useEffect(() => {
    if (!user || !user._id) {
      console.log("[FCM] ❌ No user found, skipping FCM hook.");
      return;
    }

    let mounted = true;
    const localKey = `fcm_token`;

    const requestPermissionAndToken = async () => {
      try {
        console.log("[FCM] 🔐 Requesting notification permission...");
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("[FCM] 🚫 Notification permission denied.");
            return;
          }
        }

        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });
        console.log("[FCM] ✅ Received FCM token:", token);
        if (!token) return;

        // Read existing saved token
        let saved = null;
        const savedRaw = localStorage.getItem(localKey);
        if (savedRaw) {
          try {
            saved = JSON.parse(savedRaw);
            console.log("[FCM] 🗂️ Found saved token:", saved);
          } catch (e) {
            console.log("[FCM] ⚠️ Failed to parse saved token:", e);
          }
        }

        const needSendToBackend =
          !saved || saved.token !== token || saved.userId !== user._id;

        console.log("[FCM] 📤 Need to send token to backend:", needSendToBackend);

        localStorage.setItem(localKey, JSON.stringify({ token, userId: user._id }));

        if (needSendToBackend) {
          if (mounted) setFcmToken(token);

          try {
            console.log("[FCM] 🚀 Sending token to backend...");
            await api.post("/users/save-token", {
              userId: user._id,
              fcmToken: token,
              deviceInfo: navigator.userAgent,
            });
            console.log("[FCM] ✅ Token saved to backend successfully!");
          } catch (err) {
            console.error("[FCM] ❌ Failed to save token to backend:", err);
          }
        } else {
          console.log("[FCM] 🔁 Token already up-to-date, using cached version.");
          if (mounted) setFcmToken(saved.token);
        }
      } catch (err) {
        console.error("[FCM] ❌ Error requesting token:", err);
      }
    };

    // Setup foreground listener
    if (!listenerRef.current.unsub) {
      console.log("[FCM] 🛰️ Setting up onMessage listener...");

      const unsub = onMessage(messaging, (payload) => {
        console.log("------------------------------------------------------");
        console.log("[FCM] 🔔 Foreground message received!");
        console.log("[FCM] Full payload:", payload);

        const title =
          (payload?.data?.title) ||
          (payload?.notification?.title) ||
          "New Notification";
        const body =
          (payload?.data?.body) ||
          (payload?.notification?.body) ||
          "You have a new update.";
        const tag = (payload?.data?.tag) || "default_notification";

        console.log("[FCM] 📦 Extracted title:", title);
        console.log("[FCM] 📄 Extracted body:", body);
        console.log("[FCM] 🏷️ Extracted tag:", tag);

        // Merge notifications by tag
        const store = notificationStoreRef.current;
        if (store[tag]) {
          store[tag].count += 1;
          store[tag].body = `${store[tag].count} new messages`;
          console.log(`[FCM] 🔁 Updated count for '${tag}':`, store[tag].count);
        } else {
          store[tag] = { count: 1, body };
          console.log(`[FCM] 🆕 New notification stored for tag '${tag}':`, body);
        }

        // Show Sonner toast
        toast(`${title}`, { description: store[tag].body });

        console.log(`[FCM] ✅ Toast displayed: "${title}: ${store[tag].body}"`);
        console.log("------------------------------------------------------");
      });

      listenerRef.current.unsub = typeof unsub === "function" ? unsub : undefined;
      console.log("[FCM] ✅ Foreground onMessage listener setup complete.");
    }

    // Initial token request
    requestPermissionAndToken();

    // Recheck token when window regains focus
    const onFocus = () => {
      console.log("[FCM] 🪟 Window focused → rechecking token...");
      requestPermissionAndToken();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);

      if (listenerRef.current.unsub) {
        try {
          listenerRef.current.unsub();
          console.log("[FCM] 🧹 onMessage listener unsubscribed.");
        } catch (e) {
          console.warn("[FCM] ⚠️ Error during onMessage cleanup:", e);
        }
        listenerRef.current.unsub = undefined;
      }
    };
  }, [user?._id]);

  return fcmToken;
};

export default useFirebaseMessaging;
// ----------OLD 


