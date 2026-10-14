import type { Response } from "express";
import { notificationModel } from "../models/notificationModel.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import pool from "../config/db.js";

export class notificationController {

  // ============================================================
  // 📥 1. GET MY NOTIFICATIONS (Paginated + Unread Count)
  // ============================================================
  // PDF: Citizen ko apni saari notifications newest first dikhegi
  static async getMyNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized! ❌" });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // SQL se direct unread count - Performance best
      const unreadCount = await notificationModel.getUnreadCount(userId);

      // Paginated list
      const notifications: any = await notificationModel.getNotificationsPaginated(userId, limit, offset);

      // Total count bhi lo (pagination meta ke liye)
      const [totalRows]: any = await pool.execute(`SELECT COUNT(*) as total FROM notifications WHERE user_id =?`, [userId]);

      return res.status(200).json({
        success: true,
        message: "Notifications loaded successfully! 🔔",
        meta: {
          unreadCount,
          total: totalRows[0].total,
          page,
          limit
        },
        data: notifications
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while fetching notifications." });
    }
  }

  // ============================================================
  // 🔢 2. GET UNREAD COUNT - ✅ FIX: Ye missing tha
  // ============================================================
  // Frontend badge ke liye sirf count chahiye
  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized! ❌" });

      const count = await notificationModel.getUnreadCount(userId);
      return res.status(200).json({ success: true, count });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // ============================================================
  // 🔄 3. MARK ALL NOTIFICATIONS AS READ
  // ============================================================
  static async markNotificationsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized! ❌" });

      const affectedRows = await notificationModel.markAllAsRead(userId);
      return res.status(200).json({
        success: true,
        message: "All notifications marked as read! ✔",
        data: { affectedRows }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while updating notification state." });
    }
  }

  // ============================================================
  // ✨ 4. MARK SINGLE NOTIFICATION AS READ
  // ============================================================
  static async markSingleAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const notificationId = parseInt(req.params.id as string);

      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized! ❌" });
      if (isNaN(notificationId)) return res.status(400).json({ success: false, message: "Invalid notification ID! ❌" });

      const affectedRows = await notificationModel.markSingleAsRead(notificationId, userId);

      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Notification not found or unauthorized! ❌" });
      }

      return res.status(200).json({ success: true, message: "Notification marked as read! ✔" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while updating notification." });
    }
  }

  // ============================================================
  // 🗑 5. DELETE SINGLE NOTIFICATION
  // ============================================================
  static async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const notificationId = parseInt(req.params.id as string);

      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized! ❌" });
      if (isNaN(notificationId)) return res.status(400).json({ success: false, message: "Invalid notification ID! ❌" });

      const affectedRows = await notificationModel.deleteNotification(notificationId, userId);

      if (affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Notification not found or unauthorized! ❌" });
      }

      return res.status(200).json({ success: true, message: "Notification deleted successfully! 🗑" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while deleting notification." });
    }
  }

  // ============================================================
  // 🧹 6. CLEAR READ NOTIFICATIONS - ✅ FIX: Ye missing tha
  // ============================================================
  // Saari read hui notifications ko ek sath delete - cleanup ke liye
  static async clearReadNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized! ❌" });

      // Model me method nahi hai to direct query - safe hai
      const [result]: any = await pool.execute(
        `DELETE FROM notifications WHERE user_id =? AND isRead = TRUE`,
        [userId]
      );

      return res.status(200).json({
        success: true,
        message: `Cleared ${result.affectedRows} read notifications! 🧹`,
        data: { deletedCount: result.affectedRows }
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while clearing notifications." });
    }
  }
}