import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import api from "../api/axios";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  
  // Initialize state with persisted data
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications:v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    } 
  });
  
  const [unreadCount, setUnreadCount] = useState(() => {
    try {
      const saved = localStorage.getItem('unreadCount:v1');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  
  const [loading, setLoading] = useState(false);

  // Persist notifications to localStorage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications:v1', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Persist unread count to localStorage
  useEffect(() => {
    localStorage.setItem('unreadCount:v1', unreadCount.toString());
  }, [unreadCount]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    const currentUserId = user?.id || user?._id;
    if (!isAuthenticated || !currentUserId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.get("/notifications", {
        params: { limit: 50 }
      });
      
      if (response.data?.success) {
        const notifications = response.data.data || [];
        const unreadCount = response.data.unreadCount || 0;
        
        // Force state update
        setNotifications([...notifications]);
        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      
      // Don't clear notifications on error - keep existing state
      if (error.response?.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, user?._id]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    const currentUserId = user?.id || user?._id;
    if (!isAuthenticated || !currentUserId) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.get("/notifications/unread-count");
      
      if (response.data?.success) {
        const count = response.data.count || 0;
        setUnreadCount(count);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
      if (error.response?.status === 401) {
        setUnreadCount(0);
      }
    }
  }, [isAuthenticated, user?.id, user?._id]);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    
    if (isAuthenticated && currentUserId) {
      // Force immediate fetch with a small delay to ensure auth is fully ready
      setTimeout(() => {
        fetchNotifications();
      }, 100);
      
      // Refresh unread count more frequently (every 10 seconds) for real-time updates
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 10000);
      
      return () => {
        clearInterval(interval);
      };
    } else {
      // Don't clear persisted data immediately - wait for auth to be ready
      if (isAuthenticated === false && user === null) {
        // Keep existing state, don't clear
      } else {
        // Clear persisted data when explicitly not authenticated
        localStorage.removeItem('notifications:v1');
        localStorage.removeItem('unreadCount:v1');
        setNotifications([]);
        setUnreadCount(0);
      }
    }
  }, [isAuthenticated, user?.id, user?._id, fetchNotifications, fetchUnreadCount]);

  // Add a force refresh that bypasses auth checks
  const forceRefresh = useCallback(async () => {
    const currentUserId = user?.id || user?._id;
    
    if (!currentUserId) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.get("/notifications", {
        params: { limit: 50 }
      });
      
      if (response.data?.success) {
        const notifications = response.data.data || [];
        const unreadCount = response.data.unreadCount || 0;
        
        // Force state update
        setNotifications([...notifications]);
        setUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error("Force refresh failed:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?._id]);

  const addNotification = useCallback((notif) => {
    // Check if notification already exists (avoid duplicates)
    setNotifications((prev) => {
      // If it's a temp notification, it will be replaced by the real one from API
      const exists = prev.some(n => n._id === notif._id || (n.title === notif.title && n.body === notif.body && Math.abs(new Date(n.createdAt) - new Date(notif.createdAt)) < 5000));
      if (exists) return prev;
      return [notif, ...prev];
    });
    if (!notif.read) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true, readAt: new Date() } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      const deleted = notifications.find(n => n._id === id);
      setNotifications((prev) => prev.filter(n => n._id !== id));
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading,
      addNotification, 
      markRead, 
      markAllRead,
      deleteNotification,
      refreshNotifications: fetchNotifications,
      refreshUnreadCount: fetchUnreadCount,
      forceRefresh
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
