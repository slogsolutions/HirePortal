import React, { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import api from "../api/axios";
import { Bell, X, ArrowRight } from "lucide-react";

export default function NotificationDropdown({ isOpen, onClose, onUnreadCountChange }) {
  const {
    markRead,
  } = useNotifications();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Local state for dropdown notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load notifications directly
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications', { params: { limit: 5 } });
      
      if (response.data?.success) {
        setNotifications(response.data.data || []);
        const newUnreadCount = response.data.unreadCount || 0;
        setUnreadCount(newUnreadCount);
        
        // Update parent component's unread count
        if (onUnreadCountChange) {
          onUnreadCountChange(newUnreadCount);
        }
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show only latest 5 notifications in dropdown
  const latestNotifications = useMemo(() => {
    return notifications.slice(0, 5);
  }, [notifications]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Don't close if clicking on the bell icon (handled by parent)
        if (!event.target.closest('[data-notification-bell]')) {
          onClose();
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") onClose();
      });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNotificationClick = async (notification) => {
    // Mark as read on click
    if (!notification.read) {
      try {
        await markRead(notification._id);
        // Update local state
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        
        // Update parent component's unread count
        if (onUnreadCountChange) {
          onUnreadCountChange(newUnreadCount);
        }
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }
    // Close dropdown and navigate to full notifications page
    onClose();
    navigate('/user-notifications');
  };

  const handleViewAll = () => {
    onClose();
    navigate('/user-notifications');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-background border border-border rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-accent rounded"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1 max-h-[400px]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Bell className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              You'll see notifications here when you receive them
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {latestNotifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 cursor-pointer transition-all duration-150 ${
                  notification.read
                    ? "bg-background hover:bg-accent/50"
                    : "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 border-l-2 border-l-blue-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-semibold text-sm mb-1 ${
                        !notification.read ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {notification.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(notification.createdAt)}</span>
                      {notification.sentBy && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">
                            {notification.sentBy.name || notification.sentBy.email}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-border bg-accent/30">
          <button
            onClick={handleViewAll}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-accent rounded-md transition-colors"
          >
            <span>View All Notifications</span>
            <ArrowRight className="h-4 w-4" />
            {notifications.length > 5 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                {notifications.length - 5} more
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

