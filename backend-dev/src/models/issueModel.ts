import pool from "../config/db.js";

export class issueModel {
  
  // ============================================================
  // 🔢 1. CREATE ISSUE + TICKET NUMBER
  // ============================================================
  // Naya issue create karta hai aur readable ticket number (CP-YYYY-000123) generate karta hai.
  // ✅ Deadline category ke defaultSlaHours se aati hai
  // ✅ reporter_id use ho raha hai (user_id nahi)
  static async createIssue(data: { 
    title: string; 
    description: string; 
    category_id: number; 
    location: string; 
    image: string | null; 
    reporter_id: number | undefined;
    priorityScore?: number;
    latitude?: number | null;
    longitude?: number | null;
    area_id?: number | null;
    sla_hours?: number;
  }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const priority = data.priorityScore || 1;
      // ✅ Deadline category SLA se (default 48h agar nahi mila)
      const hoursToAdd = data.sla_hours || 48;

      const insertQuery = `
        INSERT INTO issues (
          title, description, category_id, area_id, location, 
          image, reporter_id, priorityScore, latitude, longitude, deadline
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))
      `;
      const [result]: any = await connection.execute(insertQuery, [
        data.title, 
        data.description, 
        data.category_id || 1,
        data.area_id ?? null,
        data.location, 
        data.image, 
        data.reporter_id ?? null,
        priority,
        data.latitude ?? null,
        data.longitude ?? null,
        hoursToAdd
      ]);

      const issueId = result.insertId;
      const currentYear = new Date().getFullYear();
      const ticketNo = `CP-${currentYear}-${String(issueId).padStart(6, '0')}`;

      await connection.execute("UPDATE issues SET ticketNo = ? WHERE id = ?", [ticketNo, issueId]);

      await connection.commit();
      connection.release();
      return { id: issueId, ticketNo };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ============================================================
  // 📋 2. GET ALL ISSUES (with pagination)
  // ============================================================
  static async getAllIssues(limit = 10, offset = 0) {
    const query = "SELECT * FROM issues ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    const [rows] = await pool.execute(query, [limit, offset]);
    return rows;
  }

  // ============================================================
  // 🔍 3. GET ISSUE BY ID
  // ============================================================
  static async getIssueById(id: string | number) {
    const query = "SELECT * FROM issues WHERE id = ?";
    const [rows]: any = await pool.execute(query, [id]);
    return rows[0];
  }

  // ============================================================
  // 🔍 3b. FIND BY ID (controller ke liye)
  // ============================================================
  static async findById(id: number) {
    const [rows]: any = await pool.execute(
      "SELECT * FROM issues WHERE id = ? LIMIT 1",
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // ============================================================
  // 🔄 4. STATUS UPDATE + AUDIT TIMELINE
  // ============================================================
  static async updateIssueStatus(id: string | number, actorId: number, fromStatus: string, toStatus: string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        "UPDATE issues SET status = ? WHERE id = ?",
        [toStatus, id]
      );

      await connection.execute(
        "INSERT INTO issueEvents (issue_id, actor_id, from_status, to_status, note) VALUES (?, ?, ?, ?, ?)",
        [id, actorId, fromStatus, toStatus, "Status updated by staff"]
      );

      await connection.commit();
      connection.release();
      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ============================================================
  // 🔄 4b. UPDATE STATUS (controller ke liye)
  // ============================================================
  static async updateStatus(issueId: number, newStatus: string) {
    await pool.execute(
      "UPDATE issues SET status = ?, updatedAt = NOW() WHERE id = ?",
      [newStatus, issueId]
    );
  }

  // ============================================================
  // 📝 4c. LOG ISSUE EVENT (controller ke liye)
  // ============================================================
  static async logIssueEvent(issueId: number, userId: number, previousStatus: string, newStatus: string, comment: string) {
    await pool.execute(
      `INSERT INTO issueEvents (issue_id, actor_id, from_status, to_status, note, createdAt) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [issueId, userId, previousStatus, newStatus, comment || "Status updated"]
    );
  }

  // ============================================================
  // ❌ 5. DELETE ISSUE
  // ============================================================
  static async deleteIssue(id: string | number) {
    const query = "DELETE FROM issues WHERE id = ?";
    const [result]: any = await pool.execute(query, [id]);
    return result.affectedRows;
  }

  // ============================================================
  // 👍 6. UPVOTE TOGGLE + PRIORITY RECALC
  // ============================================================
  static async toggleUpvote(issueId: number, userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing]: any = await connection.execute(
        "SELECT * FROM upvotes WHERE issue_id = ? AND user_id = ?",
        [issueId, userId]
      );

      if (existing.length > 0) {
        await connection.execute("DELETE FROM upvotes WHERE issue_id = ? AND user_id = ?", [issueId, userId]);
        await connection.execute("UPDATE issues SET upvoteCount = upvoteCount - 1 WHERE id = ?", [issueId]);
      } else {
        await connection.execute("INSERT INTO upvotes (issue_id, user_id) VALUES (?, ?)", [issueId, userId]);
        await connection.execute("UPDATE issues SET upvoteCount = upvoteCount + 1 WHERE id = ?", [issueId]);
      }

      const updateScoreQuery = `
        UPDATE issues i
        JOIN categories c ON i.category_id = c.id
        SET i.priorityScore = (c.severityLevel * 10) + i.upvoteCount + FLOOR(TIMESTAMPDIFF(HOUR, i.createdAt, NOW()) / 6)
        WHERE i.id = ?
      `;
      await connection.execute(updateScoreQuery, [issueId]);

      await connection.commit();
      connection.release();
      return existing.length > 0 
        ? { action: "removed", message: "Upvote removed successfully! 👎" }
        : { action: "added", message: "Issue upvoted successfully! 👍" };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ============================================================
  // 💬 7. ADD COMMENT (with parent_id)
  // ============================================================
  static async addComment(issueId: number, userId: number, comment: string, parentId?: number | null) {
    const query = "INSERT INTO issueComments (issue_id, user_id, parent_id, comment) VALUES (?, ?, ?, ?)";
    const [result]: any = await pool.execute(query, [issueId, userId, parentId || null, comment]);
    return result.insertId;
  }

  // ============================================================
  // 🗣️ 8. GET COMMENTS BY ISSUE
  // ============================================================
  static async getCommentsByIssueId(issueId: number) {
    const query = `
      SELECT c.*, u.name as userName, u.role as userRole 
      FROM issueComments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.issue_id = ? 
      ORDER BY c.createdAt ASC
    `;
    const [rows] = await pool.execute(query, [issueId]);
    return rows;
  }

  // ============================================================
  // 🗺️ 9. RADIUS SEARCH (Haversine)
  // ============================================================
  static async getIssuesByRadius(lat: number, lng: number, radiusKm: number) {
    const query = `
      SELECT *, 
      (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance 
      FROM issues 
      HAVING distance <= ? 
      ORDER BY distance ASC
    `;
    const [rows] = await pool.execute(query, [lat, lng, lat, radiusKm]);
    return rows;
  }

  // ============================================================
  // 🚨 11. DUPLICATE CHECK (100m)
  // ============================================================
  static async checkDuplicateIssues(lat: number, lng: number, categoryId: number) {
    const query = `
      SELECT id, ticketNo, title, status, 
      (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance 
      FROM issues 
      WHERE category_id = ? AND status NOT IN ('Resolved', 'Closed', 'Rejected')
      HAVING distance <= 0.1 
      ORDER BY distance ASC
    `;
    const [rows] = await pool.execute(query, [lat, lng, lat, categoryId]);
    return rows;
  }

  // ============================================================
  // 🔔 12. FOLLOW / UNFOLLOW
  // ============================================================
  static async toggleFollowIssue(issueId: number, userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing]: any = await connection.execute(
        "SELECT * FROM issue_followers WHERE issue_id = ? AND user_id = ?",
        [issueId, userId]
      );

      if (existing.length > 0) {
        await connection.execute("DELETE FROM issue_followers WHERE issue_id = ? AND user_id = ?", [issueId, userId]);
        await connection.commit();
        connection.release();
        return { action: "unfollowed", message: "You have unfollowed this issue! 🔕" };
      } else {
        await connection.execute("INSERT INTO issue_followers (issue_id, user_id) VALUES (?, ?)", [issueId, userId]);
        await connection.commit();
        connection.release();
        return { action: "followed", message: "You are now following this issue for updates! 🔔" };
      }
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ============================================================
  // 📝 13. RESOLUTION RATING
  // ============================================================
  static async saveResolutionRating(issueId: number, rating: number, feedback: string) {
    const query = `
      UPDATE issues 
      SET resolution_rating = ?, resolution_feedback = ? 
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [rating, feedback, issueId]);
    return result;
  }

  // ============================================================
  // ⏳ 14. REOPEN WITHIN 7 DAYS — CHECK
  // ============================================================
  static async checkReopenTimeExpiry(issueId: number): Promise<boolean> {
    const query = `
      SELECT id FROM issues 
      WHERE id = ? AND resolved_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    const [rows]: any = await pool.execute(query, [issueId]);
    return rows.length > 0;
  }

  // ============================================================
  // 🔄 15. REOPEN TRANSITION
  // ============================================================
  static async executeReopenStateTransition(issueId: number, actorId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute("UPDATE issues SET status = 'Assigned', resolved_at = NULL WHERE id = ?", [issueId]);

      await connection.execute(
        "INSERT INTO issueEvents (issue_id, actor_id, from_status, to_status, note) VALUES (?, ?, 'Resolved', 'Assigned', 'Issue reopened by reporter within 7 days timeframe')",
        [issueId, actorId]
      );

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ============================================================
  // 🛡️ 16. COMMENT MODERATION
  // ============================================================
  static async checkCommentExistence(commentId: number): Promise<boolean> {
    const query = "SELECT id FROM issueComments WHERE id = ?";
    const [rows]: any = await pool.execute(query, [commentId]);
    return rows.length > 0;
  }

  static async updateCommentModerationState(commentId: number, targetStatus: string) {
    const query = "UPDATE issueComments SET status = ? WHERE id = ?";
    return await pool.execute(query, [targetStatus, commentId]);
  }

  static async fetchApprovedComments(issueId: number) {
    const query = `
      SELECT c.*, u.name as userName, u.role as userRole 
      FROM issueComments c 
      JOIN users u ON c.user_id = u.id 
      WHERE c.issue_id = ? AND c.status = 'approved'
      ORDER BY c.createdAt ASC
    `;
    const [rows] = await pool.execute(query, [issueId]);
    return rows;
  }

  // ============================================================
  // 🚩 17. ABUSE REPORTING
  // ============================================================
  static async saveAbuseReport(reporterId: number, type: string, itemId: number, reason: string, desc: string) {
    const query = `
      INSERT INTO abuse_reports (reporter_id, item_type, reported_item_id, reason, description) 
      VALUES (?, ?, ?, ?, ?)
    `;
    return await pool.execute(query, [reporterId, type, itemId, reason, desc]);
  }

  static async countItemAbuseReports(type: string, itemId: number): Promise<number> {
    const query = "SELECT COUNT(*) as total FROM abuse_reports WHERE item_type = ? AND reported_item_id = ? AND status = 'pending'";
    const [rows]: any = await pool.execute(query, [type, itemId]);
    return rows[0].total;
  }

  static async fetchAbuseReportById(reportId: number) {
    const query = "SELECT * FROM abuse_reports WHERE id = ?";
    const [rows]: any = await pool.execute(query, [reportId]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async updateReportFinalState(reportId: number, state: string) {
    const query = "UPDATE abuse_reports SET status = ? WHERE id = ?";
    return await pool.execute(query, [state, reportId]);
  }

  static async executeContentTakedownTransaction(reportId: number, type: string, itemId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (type === "comment") {
        await connection.execute("UPDATE issueComments SET status = 'rejected' WHERE id = ?", [itemId]);
      } else if (type === "issue") {
        await connection.execute("UPDATE issues SET status = 'Rejected' WHERE id = ?", [itemId]);
      }

      await connection.execute("UPDATE abuse_reports SET status = 'content_removed' WHERE id = ?", [reportId]);

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  static async executeUserBanTransaction(reportId: number, type: string, itemId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let targetUserId = itemId;

      if (type === "comment") {
        const [comm]: any = await connection.execute("SELECT user_id FROM issueComments WHERE id = ?", [itemId]);
        if (comm.length > 0) targetUserId = comm[0].user_id;
      } else if (type === "issue") {
        const [iss]: any = await connection.execute("SELECT reporter_id FROM issues WHERE id = ?", [itemId]);
        if (iss.length > 0) targetUserId = iss[0].reporter_id;
      }

      await connection.execute("UPDATE users SET isActive = FALSE WHERE id = ?", [targetUserId]);
      await connection.execute("UPDATE abuse_reports SET status = 'user_banned' WHERE id = ?", [reportId]);

      await connection.commit();
      connection.release();
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // ============================================================
  // 🔍 18. ADVANCED FILTER + PAGINATION
  // ============================================================
  static async fetchFilteredIssuesAdvanced(
    search: string | null,
    status: string | null,
    categoryId: number | null,
    limit: number,
    offset: number
  ) {
    let baseSqlString = "SELECT * FROM issues WHERE 1=1";
    let queryExecutionValueBindingsArray: any[] = [];

    if (search) {
      baseSqlString += " AND (title LIKE ? OR description LIKE ?)";
      const wildcardParameterPattern = `%${search}%`;
      queryExecutionValueBindingsArray.push(wildcardParameterPattern, wildcardParameterPattern);
    }

    if (status) {
      baseSqlString += " AND status = ?";
      queryExecutionValueBindingsArray.push(status);
    }

    if (categoryId) {
      baseSqlString += " AND category_id = ?";
      queryExecutionValueBindingsArray.push(categoryId);
    }

    baseSqlString += " ORDER BY createdAt DESC LIMIT ? OFFSET ?";
    queryExecutionValueBindingsArray.push(limit, offset);

    const [rows] = await pool.execute(baseSqlString, queryExecutionValueBindingsArray);
    return rows as any[];
  }

  // ============================================================
  // 📊 19. DASHBOARD ANALYTICS
  // ============================================================
  static async getDashboardAnalyticsModel(filters?: { startDate?: string; endDate?: string }) {
    try {
      let dateCondition = '';
      const queryParams: any[] = [];

      if (filters?.startDate && filters?.endDate) {
        dateCondition = 'WHERE createdAt BETWEEN ? AND ?';
        queryParams.push(filters.startDate, filters.endDate);
      }

      const [totalRows]: any = await pool.query(
        `SELECT COUNT(*) as total FROM issues ${dateCondition}`,
        queryParams
      );

      const [statusRows]: any = await pool.query(
        `SELECT status, COUNT(*) as count FROM issues ${dateCondition} GROUP BY status`,
        queryParams
      );

      const [departmentRows]: any = await pool.query(
        `SELECT 
           d.id as department_id, 
           d.name as department_name, 
           COUNT(i.id) as total_issues 
         FROM departments d 
         LEFT JOIN issues i ON d.id = i.department_id ${dateCondition ? 'AND i.createdAt BETWEEN ? AND ?' : ''} 
         GROUP BY d.id, d.name`,
        dateCondition ? [filters?.startDate, filters?.endDate] : []
      );

      const [categoryRows]: any = await pool.query(
        `SELECT 
           c.id as category_id, 
           c.name as category_name, 
           COUNT(i.id) as total_issues 
         FROM categories c 
         LEFT JOIN issues i ON c.id = i.category_id ${dateCondition ? 'AND i.createdAt BETWEEN ? AND ?' : ''} 
         GROUP BY c.id, c.name`,
        dateCondition ? [filters?.startDate, filters?.endDate] : []
      );

      const [resolutionTimeRows]: any = await pool.query(
        `SELECT 
           AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) as avg_resolution_hours 
         FROM issues 
         WHERE status IN ('Resolved', 'Closed') ${dateCondition ? 'AND createdAt BETWEEN ? AND ?' : ''}`,
        queryParams
      );

      return {
        totalIssues: totalRows[0].total,
        issuesByStatus: statusRows,
        issuesByDepartment: departmentRows,
        issuesByCategory: categoryRows,
        averageResolutionHours: Math.round(resolutionTimeRows[0].avg_resolution_hours || 0),
      };
    } catch (error) {
      console.error("Error in getDashboardAnalyticsModel:", error);
      throw error;
    }
  }


  static async getIssuesByBounds(minLat: number, maxLat: number, minLng: number, maxLng: number) {
    const query = `
      SELECT id, ticketNo, title, latitude, longitude, status, priorityScore 
      FROM issues 
      WHERE latitude BETWEEN ? AND ? 
        AND longitude BETWEEN ? AND ? 
      LIMIT 500;
    `;
    const [rows] = await pool.execute(query, [minLat, maxLat, minLng, maxLng]);
    return rows;
  }

  // ============================================================
  // 📍 2. NEARBY ISSUES SEARCH (Haversine Formula)
  // ============================================================
  static async getNearbyIssues(lat: number, lng: number, radiusKm: number = 5) {
    const query = `
      SELECT id, ticketNo, title, latitude, longitude, status,
      (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM issues
      HAVING distance <= ?
      ORDER BY distance ASC
      LIMIT 500;
    `;
    const [rows] = await pool.execute(query, [lat, lng, lat, radiusKm]);
    return rows;
  }
}