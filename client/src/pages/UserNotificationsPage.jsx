import React, { useEffect, useState, useMemo } from "react";
import { useNotifications } from "../context/NotificationContext";
import {
  Bell,
  Check,
  Trash2,
  CheckCheck,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Inbox,
  Archive,
  CheckCircle2,
  User,
  Mail,
  Calendar,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserNotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [selectedTab, setSelectedTab] = useState("all"); // "all" | "unread"
  const [selectedFilter, setSelectedFilter] = useState("inbox"); // "inbox" | "saved" | "done"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Filter notifications based on tab and search
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by tab
    if (selectedTab === "unread") {
      filtered = filtered.filter((n) => !n.read);
    }

    // Filter by selected filter
    if (selectedFilter === "saved") {
      // For now, we don't have saved state, so show all
      filtered = filtered;
    } else if (selectedFilter === "done") {
      filtered = filtered.filter((n) => n.read);
    } else {
      // inbox - show all
      filtered = filtered;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.body.toLowerCase().includes(query) ||
          n.sentBy?.name?.toLowerCase().includes(query) ||
          n.sentBy?.email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, selectedTab, selectedFilter, searchQuery]);

  const handleNotificationClick = async (notification) => {
    // Mark as read on click
    if (!notification.read) {
      await markRead(notification._id);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this notification?")) {
      setDeletingId(id);
      try {
        await deleteNotification(id);
        setSelectedNotifications((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setSelectedNotifications(new Set());
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(
        new Set(filteredNotifications.map((n) => n._id))
      );
    }
  };

  const handleSelectNotification = (id) => {
    setSelectedNotifications((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkMarkRead = async () => {
    const unreadSelected = filteredNotifications.filter(
      (n) => selectedNotifications.has(n._id) && !n.read
    );
    for (const notification of unreadSelected) {
      await markRead(notification._id);
    }
    setSelectedNotifications(new Set());
  };

  const handleBulkDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedNotifications.size} notification(s)?`
      )
    ) {
      const idsToDelete = Array.from(selectedNotifications);
      for (const id of idsToDelete) {
        await deleteNotification(id);
      }
      setSelectedNotifications(new Set());
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getNotificationIcon = (notification) => {
    // You can customize icons based on notification type/tag
    if (notification.tag?.includes("offer")) return <Mail className="h-5 w-5 text-blue-600" />;
    if (notification.tag?.includes("interview")) return <User className="h-5 w-5 text-purple-600" />;
    return <Bell className="h-5 w-5 text-gray-600" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border bg-card overflow-y-auto">
          <div className="p-4">
            {/* Inbox Section */}
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Inbox
              </h2>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFilter("inbox")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedFilter === "inbox"
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    <span>Inbox</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedFilter("saved")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedFilter === "saved"
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                  <span>Saved</span>
                </button>
                <button
                  onClick={() => setSelectedFilter("done")}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedFilter === "done"
                      ? "bg-accent text-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done</span>
                </button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Filters
              </h2>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Assigned</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                  <User className="h-4 w-4 text-purple-600" />
                  <span>Participating</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                  <span className="text-yellow-600 font-bold">@</span>
                  <span>Mentioned</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6" />
                    <h1 className="text-2xl font-semibold">Notifications</h1>
                  </div>
                  {selectedNotifications.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleBulkMarkRead}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Mark as read
                      </Button>
                      <Button
                        onClick={handleBulkDelete}
                        variant="outline"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      <Button
                        onClick={() => setSelectedNotifications(new Set())}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tabs and Search */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 border-b border-border">
                    <button
                      onClick={() => setSelectedTab("all")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        selectedTab === "all"
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedTab("unread")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        selectedTab === "unread"
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Unread
                      {unreadCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search notifications"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleMarkAllRead}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Mark all as read
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    {searchQuery
                      ? "Try adjusting your search query"
                      : "You're all caught up! No notifications here."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Select All */}
                  <div className="mb-2 px-4 py-2 border-b border-border">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filteredNotifications.length > 0 &&
                          selectedNotifications.size === filteredNotifications.length
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all ({filteredNotifications.length})
                      </span>
                    </label>
                  </div>

                  {/* Notifications */}
                  <div className="divide-y divide-border">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification._id}
                        onMouseEnter={() => setHoveredId(notification._id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => handleNotificationClick(notification)}
                        className={`group relative px-4 py-3 cursor-pointer transition-colors ${
                          selectedNotifications.has(notification._id)
                            ? "bg-accent"
                            : notification.read
                            ? "bg-background hover:bg-accent/50"
                            : "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedNotifications.has(notification._id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectNotification(notification._id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />

                          {/* Icon */}
                          <div className="mt-0.5 flex-shrink-0">
                            {getNotificationIcon(notification)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3
                                    className={`font-semibold text-sm ${
                                      !notification.read
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {notification.title}
                                  </h3>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {notification.body}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(notification.createdAt)}
                                  </span>
                                  {notification.sentBy && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {notification.sentBy.name || notification.sentBy.email}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Actions - Show on hover */}
                              {hoveredId === notification._id && (
                                <div
                                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {!notification.read && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markRead(notification._id);
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title="Mark as read"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Save"
                                  >
                                    <Bookmark className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={(e) => handleDelete(notification._id, e)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete"
                                    disabled={deletingId === notification._id}
                                  >
                                    {deletingId === notification._id ? (
                                      <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Info */}
                  <div className="mt-4 px-4 py-3 text-sm text-muted-foreground border-t border-border">
                    Showing {filteredNotifications.length} of {notifications.length} notifications
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
