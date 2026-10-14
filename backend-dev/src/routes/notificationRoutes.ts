import { Router } from "express";
import { notificationController } from "../controllers/notificationController.js";
import { verifyToken, checkTokenBlacklist, isAccountActive } from "../middlewares/authMiddleware.js";

const router = Router();

// ============================================================
// 🔔 NOTIFICATION CENTER ROUTES - PDF: 100% Auth Protected
// ============================================================
// Saare routes par verifyToken + blacklist + isActive check
// Sirf logged-in user apni notifications dekh/mark/delete kar sakta hai

// 📋 1. GET / - User ki saari notifications (newest first) + pagination
// Query:?page=1&limit=10
router.get(
  "/",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  notificationController.getMyNotifications
);

// 🔢 2. GET /unread-count - Unread badge ke liye count
router.get(
  "/unread-count",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  notificationController.getUnreadCount
);

// 🔄 3. PATCH /read - Saari unread ko ek sath read mark (Mark all as read)
router.patch(
  "/read",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  notificationController.markNotificationsRead
);

// ✅ 4. PATCH /:id/read - ✅ FIX: Single notification ko read mark
// PDF requirement tha jo missing tha
router.patch(
  "/:id/read",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  notificationController.markSingleAsRead
);

// 🗑 5. DELETE /:id - ✅ FIX: Single notification delete
// User apni notification delete kar sake
router.delete(
  "/:id",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  notificationController.deleteNotification
);

// 🧹 6. DELETE / - Saari read notifications clear (optional - cleanup)
router.delete(
  "/",
  verifyToken,
  checkTokenBlacklist,
  isAccountActive,
  notificationController.clearReadNotifications
);

export default router;