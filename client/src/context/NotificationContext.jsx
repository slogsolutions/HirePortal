import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import api from "../api/axios";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setLoading(true);
      const response = await api.get("/notifications", {
        params: { userId: user.id, limit: 50 }
      });
      
      if (response.data?.success) {
        setNotifications(response.data.data || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      const response = await api.get("/notifications/unread-count", {
        params: { userId: user.id }
      });
      
      if (response.data?.success) {
        setUnreadCount(response.data.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [isAuthenticated, user?.id]);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchNotifications();
      // Refresh unread count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.id, fetchNotifications, fetchUnreadCount]);

  const addNotification = useCallback((notif) => {
    setNotifications((prev) => [notif, ...prev]);
    if (!notif.read) {
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`, { userId: user?.id });
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true, readAt: new Date() } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, [user?.id]);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all", { userId: user?.id });
      setNotifications((prev) => prev.map(n => ({ ...n, read: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`, { data: { userId: user?.id } });
      const deleted = notifications.find(n => n._id === id);
      setNotifications((prev) => prev.filter(n => n._id !== id));
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }, [user?.id, notifications]);

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
      refreshUnreadCount: fetchUnreadCount
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
