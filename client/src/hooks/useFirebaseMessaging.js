// src/hooks/useFirebaseMessaging.js
import { useEffect, useRef, useState, useContext } from "react";
import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import { toast } from "sonner";
import api from "../api/axios";
import { useNotifications } from "../context/NotificationContext";

const useFirebaseMessaging = (user) => {
  const [fcmToken, setFcmToken] = useState(null);
  const listenerRef = useRef({});
  const notificationStoreRef = useRef({});
  const saveTokenRetryRef = useRef(null);
  const tokenCheckIntervalRef = useRef(null);
  
  // Get notification context to update notifications in real-time
  // This hook must be called inside NotificationProvider (which it is, via main.jsx)
  const { refreshNotifications, refreshUnreadCount, addNotification } = useNotifications();

  // Retry logic for saving token
  const saveTokenToBackend = async (userId, token, platform, retries = 5) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[FCM] 🚀 Sending token to backend (attempt ${attempt}/${retries})...`);
        
        // Try authenticated route first (if user is logged in), fallback to regular route
        try {
          await api.post("/fcm/token/me", {
            token,
            platform,
          });
        } catch (authErr) {
          // If authenticated route fails (401 or not found), try regular route with userId
          if (authErr.response?.status === 401 || authErr.response?.status === 404) {
            console.log("[FCM] 🔄 Authenticated route failed, trying regular route with userId...");
            await api.post("/fcm/token", {
              userId,
              token,
              platform,
            });
          } else {
            throw authErr;
          }
        }
        
        console.log("[FCM]  Token saved to backend successfully!");
        return true;
      } catch (err) {
        const errorMsg = err?.response?.data?.message || err.message || 'Unknown error';
        console.error(`[FCM] ❌ Failed to save token to backend (attempt ${attempt}/${retries}):`, errorMsg);
        
        if (attempt < retries) {
          // Exponential backoff: wait 2^attempt seconds
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[FCM] ⏳ Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error("[FCM] ❌ All retry attempts failed. Token will be saved on next check.");
          return false;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    if (!user || !user.id) {
      console.log("[FCM] ❌ No authenticated user, skipping FCM setup.");
      return;
    }

    let mounted = true;
    const localKey = `fcm_token`;

    const requestPermissionAndToken = async (forceSave = false) => {
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
        console.log("[FCM]  Received FCM token:", token);
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

        // Always update localStorage with current token
        localStorage.setItem(localKey, JSON.stringify({ 
          token, 
          userId: user.id,
          savedAt: new Date().toISOString()
        }));

        if (mounted) setFcmToken(token);

        // Determine if we need to save to backend
        const tokenChanged = !saved || saved.token !== token;
        const userChanged = !saved || saved.userId !== user.id;
        const needSendToBackend = forceSave || tokenChanged || userChanged;

        console.log("[FCM] 📤 Token sync status:", {
          needSendToBackend,
          tokenChanged,
          userChanged,
          savedUserId: saved?.userId,
          currentUserId: user.id,
          oldToken: saved?.token?.substring(0, 20) + "...",
          newToken: token?.substring(0, 20) + "...",
        });

        // ALWAYS save to backend when token is first obtained or changed
        // This ensures token is saved immediately in the database
        if (needSendToBackend) {
          console.log("[FCM] 💾 Saving token to backend immediately...");
          const saved = await saveTokenToBackend(user.id, token, "web");
          if (saved) {
            console.log("[FCM]  Token successfully saved to database!");
            // Update localStorage to mark as saved
            localStorage.setItem(localKey, JSON.stringify({ 
              token, 
              userId: user.id,
              savedAt: new Date().toISOString(),
              savedToBackend: true
            }));
          } else if (mounted) {
            // Schedule retry on next focus if save failed
            console.log("[FCM] ⏰ Will retry token save on next focus event");
          }
        } else {
          console.log("[FCM] 🔁 Token unchanged, skipping backend save.");
        }
      } catch (err) {
        console.error("[FCM] ❌ Error requesting token:", err);
        // If it's a token error, try again after a delay
        if (err.code === 'messaging/token-subscribe-failed') {
          console.log("[FCM] ⏰ Token subscription failed, will retry in 5 seconds...");
          setTimeout(() => {
            if (mounted) requestPermissionAndToken(true);
          }, 5000);
        }
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

        // Show toast notification
        toast(`${title}`, { 
          description: body,
          duration: 5000,
        });

        // Immediately refresh notifications to update count and list
        console.log("[FCM] 🔄 Refreshing notifications list and unread count...");
        refreshNotifications();
        refreshUnreadCount();

        // Also add notification to context immediately (optimistic update)
        // This creates a temporary notification until the API call completes
        const tempNotification = {
          _id: `temp_${Date.now()}`,
          title,
          body,
          tag,
          read: false,
          createdAt: new Date().toISOString(),
          data: payload.data || {},
        };
        addNotification(tempNotification);

        console.log(`[FCM]  Toast displayed and notifications refreshed: "${title}: ${body}"`);
        console.log("------------------------------------------------------");
      });

      listenerRef.current.unsub = typeof unsub === "function" ? unsub : undefined;
      console.log("[FCM]  Foreground onMessage listener setup complete.");
    }

    // Initial token request - force save on mount
    requestPermissionAndToken(true);

    // Periodic token check (every 5 minutes) to catch token rotation
    tokenCheckIntervalRef.current = setInterval(() => {
      if (mounted) {
        console.log("[FCM] 🔄 Periodic token check...");
        requestPermissionAndToken(false);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Recheck token when window regains focus
    const onFocus = () => {
      console.log("[FCM] 🪟 Window focused → rechecking token...");
      requestPermissionAndToken(true); // Force save on focus
    };
    window.addEventListener("focus", onFocus);

    // Listen for visibility changes (tab switch)
    const onVisibilityChange = () => {
      if (!document.hidden && mounted) {
        console.log("[FCM] 👁️ Tab visible → rechecking token...");
        requestPermissionAndToken(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      // Clear intervals
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      if (saveTokenRetryRef.current) {
        clearTimeout(saveTokenRetryRef.current);
        saveTokenRetryRef.current = null;
      }

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
  }, [user?.id]);

  return fcmToken;
};

export default useFirebaseMessaging;
// ----------OLD 


