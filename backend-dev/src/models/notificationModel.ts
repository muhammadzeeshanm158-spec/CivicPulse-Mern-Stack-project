import pool from "../config/db.js";

export class notificationModel {
  
  // ============================================================
  // 📝 1. NOTIFICATION CREATE / SAVE
  // ============================================================
  static async createNotification(userId: number, type: string, issueId: number, message: string) {
    const query = `
      INSERT INTO notifications (user_id, type, issue_id, message) 
      VALUES (?, ?, ?, ?)
    `;
    const [result]: any = await pool.execute(query, [userId, type, issueId, message]);
    return result.insertId;
  }

  // ============================================================
  // 📋 2. GET NOTIFICATIONS BY USER (Simple)
  // ============================================================
  static async getNotificationsByUser(userId: number) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY createdAt DESC
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  }

  // ============================================================
  // 🔄 3. MARK ALL AS READ
  // ============================================================
  static async markAllAsRead(userId: number) {
    const query = `
      UPDATE notifications 
      SET readAt = NOW() 
      WHERE user_id = ? AND readAt IS NULL
    `;
    const [result]: any = await pool.execute(query, [userId]);
    return result.affectedRows;
  }

  // ============================================================
  // ✨ NEW ADDED FUNCTIONS (PDF Requirements ke mutabiq)
  // ============================================================

  // ❌ 1. Get Unread Count
  static async getUnreadCount(userId: number) {
    const query = `
      SELECT COUNT(*) AS unread_count 
      FROM notifications 
      WHERE user_id = ? AND readAt IS NULL
    `;
    const [rows]: any = await pool.execute(query, [userId]);
    return rows[0].unread_count;
  }

  // ❌ 2. Mark Single Notification as Read (with ownership check)
  static async markSingleAsRead(notificationId: number, userId: number) {
    const query = `
      UPDATE notifications 
      SET readAt = NOW() 
      WHERE id = ? AND user_id = ?
    `;
    const [result]: any = await pool.execute(query, [notificationId, userId]);
    return result.affectedRows; // Agar 0 ho toh matlab notification nahi mila ya user ki nahi thi
  }

  // ❌ 3. Get Notifications Paginated (Limit & Offset)
  static async getNotificationsPaginated(userId: number, limit: number, offset: number) {
    // Note: pool.query use kar rahe hain kyunki LIMIT aur OFFSET numbers hote hain
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [userId, limit, offset]);
    return rows;
  }

  // ❌ 4. Delete Notification
  static async deleteNotification(notificationId: number, userId: number) {
    const query = `
   DELETE... WHERE user_id=? AND readAt IS NOT NULL
    `;
    const [result]: any = await pool.execute(query, [notificationId, userId]);
    return result.affectedRows;
  }

  // ❌ 5. Get Notifications by Issue ID
  static async getNotificationsByIssue(issueId: number) {
    const query = `
      SELECT * FROM notifications 
      WHERE issue_id = ? 
      ORDER BY createdAt DESC
    `;
    const [rows] = await pool.execute(query, [issueId]);
    return rows;
  }

  // ❌ 6. Mark All Notifications as Read by Issue ID
  static async markAsReadByIssue(issueId: number, userId: number) {
    const query = `
      UPDATE notifications 
      SET readAt = NOW() 
      WHERE issue_id = ? AND user_id = ? AND readAt IS NULL
    `;
    const [result]: any = await pool.execute(query, [issueId, userId]);
    return result.affectedRows;
  }

  // ❌ 7. Create Bulk Notifications (e.g., for issue followers)
  static async createBulkNotifications(notificationsData: Array<{ userId: number, type: string, issueId: number, message: string }>) {
    if (!notificationsData || notificationsData.length === 0) return 0;

    const values = notificationsData.map(n => [n.userId, n.type, n.issueId, n.message]);
    const query = `
      INSERT INTO notifications (user_id, type, issue_id, message) 
      VALUES ?
    `;
    const [result]: any = await pool.query(query, [values]);
    return result.affectedRows;
  }
}