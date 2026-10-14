import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import API from "../../services/api.ts";

export interface NotificationItem {
  id: number; // FIX 1: _id nahi, id hai - MySQL number hai, Mongo string nahi
  _id?: string; // backward compat ke liye optional rakha
  type: "status_change" | "assignment" | "comment" | "sla_breach" | "general";
  title: string;
  message: string;
  issue_id?: number; // FIX 2: issueId nahi, issue_id hai (backend)
  issueId?: string;
  is_read?: boolean; // backend is_read bhej sakta hai
  isRead: boolean;
  created_at?: string;
  createdAt: string;
}

const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Helper: MySQL id aur Mongo _id dono ko handle karega
  const getNotifId = (n: any) => n.id ?? n._id;
  const getIssueId = (n: any) => n.issue_id ?? n.issueId;

  const fetchNotifications = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await API.get(`/notifications?page=${currentPage}&limit=5`);
      const data = res.data;
      setNotifications(data.notifications || data.data || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
  }, [page]);

  useEffect(() => {
    // FIX 3: Hardcoded localhost:5000 nahi, dynamic URL use karo - production me fail hota tha
    const socketUrl =
      (
        import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }
      ).env?.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:5000";
    const socket: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socket.on("notification", (newNotif: NotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
      setUnreadCount((prev) => prev + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      )
        setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = async (notif: NotificationItem) => {
    const notifId = getNotifId(notif);
    const issueId = getIssueId(notif);
    if (!notif.isRead && !notif.is_read) {
      try {
        await API.patch(`/notifications/${notifId}/read`); // FIX: notifId use karo
        setNotifications((prev) =>
          prev.map((n) =>
            getNotifId(n) === notifId
              ? { ...n, isRead: true, is_read: true }
              : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Error marking as read", err);
      }
    }
    setIsOpen(false);
    if (issueId) navigate(`/issue/${issueId}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, is_read: true })),
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read", err);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "status_change":
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case "assignment":
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case "sla_breach":
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-500 text-white text- font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text- font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text- text-indigo-600 hover:underline font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No notifications found.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={getNotifId(notif)}
                  onClick={() => handleItemClick(notif)}
                  className={`p-3.5 hover:bg-slate-100 transition cursor-pointer flex items-start gap-3 ${!notif.isRead && !notif.is_read ? "bg-indigo-50/30" : ""}`}
                >
                  <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-2xs shrink-0">
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {notif.title}
                    </p>
                    <p className="text- text-slate-700 line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>
                    <span className="text- text-slate-500 mt-1 block">
                      {new Date(
                        notif.createdAt || notif.created_at || "",
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text- font-semibold text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
