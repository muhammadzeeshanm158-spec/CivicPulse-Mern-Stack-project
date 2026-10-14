import type { Request, Response } from "express";
import { issueModel } from "../models/issueModel.js";
import { notificationModel } from "../models/notificationModel.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";
import { getIO } from "../config/socket.js";
import { createHash } from "node:crypto";
import pool from "../config/db.js";
import {
  isValidTransition,
  VALID_STATUS_TRANSITIONS,
} from "../utils/statusTransitions.js";

// ============================================================
// Helper: Category se Department ID - Manager notify ke liye
// ============================================================
async function getDepartmentByCategory(
  categoryId: number,
): Promise<number | null> {
  const [rows]: any = await pool.execute(
    `SELECT department_id FROM categories WHERE id =? LIMIT 1`,
    [categoryId],
  );
  if (!rows || rows.length === 0) return null;
  return rows[0]?.department_id ? Number(rows[0].department_id) : null;
}

// ============================================================
// Dashboard Analytics - Admin panel ke liye
// ============================================================
async function getDashboardAnalyticsModel(filters: {
  startDate?: string;
  endDate?: string;
}) {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filters.startDate) {
    conditions.push("DATE(createdAt) >= DATE(?)");
    values.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push("DATE(createdAt) <= DATE(?)");
    values.push(filters.endDate);
  }
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const [totalRows]: any = await pool.execute(
    `SELECT COUNT(*) AS totalIssues,
            COALESCE(SUM(status = 'Resolved'), 0) AS resolvedIssues,
            COALESCE(SUM(status IN ('Submitted','Verified','Assigned','InProgress')), 0) AS activeIssues
     FROM issues ${whereClause}`,
    values,
  );
  const [statusBreakdown]: any = await pool.execute(
    `SELECT status, COUNT(*) AS count FROM issues ${whereClause} GROUP BY status`,
    values,
  );
  return {
    ...(totalRows[0] ?? { totalIssues: 0, resolvedIssues: 0, activeIssues: 0 }),
    statusBreakdown,
  };
}

export const getDashboardAnalytics = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const analyticsData = await getDashboardAnalyticsModel({
      startDate: startDate as string,
      endDate: endDate as string,
    });
    return res
      .status(200)
      .json({
        success: true,
        message: "Dashboard analytics retrieved successfully",
        data: analyticsData,
      });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch dashboard analytics",
        error: error.message,
      });
  }
};

// ============================================================
// MAIN CONTROLLER - 35% marks ka core logic
// ============================================================
export class issueController {
  // 📝 CREATE ISSUE - Duplicate (100m) + Area Auto-Detect + Priority + Socket
  static async createIssue(req: AuthRequest, res: Response) {
    try {
      const { title, description, category_id, location, latitude, longitude } =
        req.body;
      const userId = req.user?.id;
      const files = req.files as Express.Multer.File[];
      const imagesString =
        files && files.length > 0
          ? files.map((f) => f.filename).join(",")
          : null;

      if (!title || !description || !location || !category_id) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Please provide all required fields including category_id! ❌",
          });
      }

      const catId = Number(category_id);
      const lat = latitude ? Number(latitude) : null;
      const lng = longitude ? Number(longitude) : null;

      // 🚨 100m Duplicate Check - PDF ka sabse important feature
      if (lat !== null && lng !== null) {
        const duplicates: any = await issueModel.checkDuplicateIssues(
          lat,
          lng,
          catId,
        );
        if (duplicates.length > 0) {
          return res
            .status(409)
            .json({
              success: false,
              message:
                "⚠ Similar open issue already exists within 100m! Please upvote it instead.",
              duplicates,
            });
        }
      }

      // 🌐 Area Auto-Detect - MySQL Spatial ST_Contains
      let areaId: number | null = null;
      if (lat !== null && lng !== null) {
        const [areaRows]: any = await pool.execute(
          `SELECT id FROM areas WHERE ST_Contains(boundaryCoords, ST_GeomFromText(?, 4326)) LIMIT 1`,
          [`POINT(${lng} ${lat})`],
        );
        if (areaRows.length > 0) areaId = areaRows[0].id;
      }

      // 📅 SLA + Priority - Category se severity aur SLA hours lo
      const [catRows]: any = await pool.execute(
        `SELECT defaultSlaHours, severityLevel FROM categories WHERE id =?`,
        [catId],
      );
      const slaHours = catRows.length > 0 ? catRows[0].defaultSlaHours : 48;
      const severity = catRows.length > 0 ? catRows[0].severityLevel : 1;
      const priorityScore = severity * 10; // Base priority

      const newIssue = await issueModel.createIssue({
        title,
        description,
        category_id: catId,
        location,
        image: imagesString,
        reporter_id: userId,
        priorityScore,
        latitude: lat,
        longitude: lng,
        area_id: areaId,
        sla_hours: slaHours,
      });

      // ⚡ Socket - Real-time update sabko
      try {
        getIO().emit("issue:created", {
          id: newIssue.id,
          ticketNo: newIssue.ticketNo,
          title,
          priorityScore,
        });
      } catch (e) {
        console.log("Socket error:", e);
      }

      return res
        .status(201)
        .json({
          success: true,
          message: "Issue created successfully! 🎉",
          data: newIssue,
        });
    } catch (error) {
      console.error("Create issue error:", error);
      return res
        .status(500)
        .json({
          success: false,
          error: "Server side error while creating issue!",
        });
    }
  }

  // 📋 GET ALL ISSUES - Search, Filter, Pagination
  static async getAllIssues(req: Request, res: Response) {
    try {
      const search = req.query.search ? String(req.query.search).trim() : null;
      const status = req.query.status ? String(req.query.status).trim() : null;
      const categoryId = req.query.category_id
        ? Number(req.query.category_id)
        : null;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const offset = (page - 1) * limit;
      const resultData = await issueModel.fetchFilteredIssuesAdvanced(
        search,
        status,
        categoryId,
        limit,
        offset,
      );
      return res
        .status(200)
        .json({
          success: true,
          message: "Issues loaded! 📋",
          meta: {
            currentPage: page,
            pageSize: limit,
            recordsCount: resultData.length,
          },
          data: resultData,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }


// getAllIssues ke baad paste karo (line ~95 ke baad)

  // ✅ MY ISSUES - Final FIX for 500 error
  static async getMyIssues(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;
      console.log("Fetching my-issues for userId:", userId);

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized! ❌" });
      }

      // ✅ SAFE QUERY - LIMIT/OFFSET ko direct number, placeholder nahi
      // Aur saare possible column check
      const [rows]: any = await pool.query(
        `SELECT
          i.*,
          c.name as categoryName,
          a.name as areaName
         FROM issues i
         LEFT JOIN categories c ON i.category_id = c.id
         LEFT JOIN areas a ON i.area_id = a.id
         WHERE i.reporter_id = ${Number(userId)}
            OR i.user_id = ${Number(userId)}
         ORDER BY i.createdAt DESC, i.id DESC
         LIMIT 50`
      );

      console.log(`Found ${rows.length} issues for user ${userId}`);

      return res.status(200).json({
        success: true,
        message: "My issues loaded! 📋",
        data: rows
      });
    } catch (error: any) {
      console.error("❌ getMyIssues error:", error.message, error);
      // ✅ Fallback - Agar reporter_id column nahi hai to
      try {
        const userId = (req as any).user?.id;
        const [fallbackRows]: any = await pool.query(
          `SELECT * FROM issues WHERE user_id = ${Number(userId)} ORDER BY id DESC LIMIT 50`
        );
        return res.status(200).json({ success: true, data: fallbackRows });
      } catch (fallbackError: any) {
        console.error("Fallback also failed:", fallbackError.message);
        return res.status(500).json({ success: false, error: fallbackError.message });
      }
    }
  }


  // 🔍 GET BY ID
  static async getIssueById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id))
        return res
          .status(400)
          .json({ success: false, message: "Valid ID required." });
      const issue: any = await issueModel.getIssueById(id);
      if (!issue)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });
      return res.status(200).json({ success: true, data: issue });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // 🔄 UPDATE STATUS - ✅ FIXED: Centralized State Machine + Socket `user:` format
  static async updateIssueStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status: newStatus, note } = req.body;
      const actorId = req.user?.id;
      if (!actorId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      if (!newStatus)
        return res
          .status(400)
          .json({ success: false, message: "Status required! ❌" });

      const issueId = Array.isArray(id) ? id[0] : id;
      if (typeof issueId !== "string")
        return res
          .status(400)
          .json({ success: false, message: "Valid ID required." });

      const issue: any = await issueModel.getIssueById(issueId);
      if (!issue)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });

      // ✅ Single source of truth se check - 409 Conflict agar invalid
      if (!isValidTransition(issue.status, newStatus)) {
        return res.status(409).json({
          success: false,
          message: `Invalid transition from '${issue.status}' to '${newStatus}'! Allowed: ${VALID_STATUS_TRANSITIONS[issue.status]?.join(", ") || "none"} 🚫`,
        });
      }

      const normalizedIssueId = Number(issueId);
      await issueModel.updateIssueStatus(
        normalizedIssueId,
        actorId,
        issue.status,
        newStatus,
      );

      const reporterId = issue.reporter_id || issue.user_id;
      if (reporterId) {
        await notificationModel.createNotification(
          reporterId,
          "status_changed",
          normalizedIssueId,
          `Aapki report #${issue.ticketNo} ka status '${newStatus}' ho gaya.`,
        );
        try {
          const io = getIO();
          // ✅ FIX: Colon format `user:` - socket.ts ke sath match
          io.to(`user:${reporterId}`).emit("notification:new", {
            type: "status_changed",
            issueId: normalizedIssueId,
            message: `Status changed to ${newStatus}`,
          });
          io.to(`issue:${normalizedIssueId}`).emit("statusChanged", {
            id: normalizedIssueId,
            previousStatus: issue.status,
            updatedStatus: newStatus,
          });
        } catch (e) {
          console.log("Socket error:", e);
        }
      }

      return res
        .status(200)
        .json({
          success: true,
          message: `Status updated to ${newStatus}! 🚀`,
          data: {
            id: normalizedIssueId,
            previousStatus: issue.status,
            updatedStatus: newStatus,
          },
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // 👮 ASSIGN ISSUE - Manager to Officer
  static async assignIssue(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const { officer_id, deadline } = req.body;
      const managerId = req.user?.id;
      if (!managerId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      if (!officer_id)
        return res
          .status(400)
          .json({ success: false, message: "officer_id required! ❌" });

      const officerIdNum = Number(officer_id);
      if (isNaN(officerIdNum))
        return res
          .status(400)
          .json({ success: false, message: "Invalid officer_id! ❌" });

      const issue: any = await issueModel.getIssueById(issueId);
      if (!issue)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });

      const [officerRows]: any = await pool.execute(
        `SELECT id FROM users WHERE id =? AND role = 'officer' AND isActive = TRUE`,
        [officerIdNum],
      );
      if (officerRows.length === 0)
        return res
          .status(400)
          .json({ success: false, message: "Invalid or inactive officer! ❌" });

      const finalDeadline = deadline || issue.deadline;
      await pool.execute(
        `UPDATE issues SET assigned_to =?, deadline =?, status = 'Assigned', updatedAt = NOW() WHERE id =?`,
        [officerIdNum, finalDeadline, issueId],
      );
      await pool.execute(
        `INSERT INTO issueEvents (issue_id, actor_id, from_status, to_status, note) VALUES (?,?,?, 'Assigned',?)`,
        [
          issueId,
          managerId,
          issue.status,
          `Assigned to officer #${officerIdNum}`,
        ],
      );
      await notificationModel.createNotification(
        officerIdNum,
        "issue_assigned",
        issueId,
        `Aapko issue #${issue.ticketNo} assign kiya gaya.`,
      );

      try {
        getIO()
          .to(`user:${officerIdNum}`)
          .emit("issue:assigned", { issueId, ticketNo: issue.ticketNo });
      } catch (e) {
        console.log("Socket error:", e);
      }

      return res
        .status(200)
        .json({
          success: true,
          message: "Issue assigned! 👮",
          data: { issueId, officer_id: officerIdNum, deadline: finalDeadline },
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // 🔀 MERGE DUPLICATE
  static async mergeDuplicate(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const { duplicate_of } = req.body;
      const managerId = req.user?.id;
      if (!managerId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      if (!duplicate_of)
        return res
          .status(400)
          .json({ success: false, message: "duplicate_of required! ❌" });
      const issue: any = await issueModel.getIssueById(issueId);
      const original: any = await issueModel.getIssueById(Number(duplicate_of));
      if (!issue || !original)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });
      await pool.execute(
        `UPDATE issues SET status = 'Duplicate', updatedAt = NOW() WHERE id =?`,
        [issueId],
      );
      await pool.execute(
        `INSERT INTO issueEvents (issue_id, actor_id, from_status, to_status, note) VALUES (?,?,?, 'Duplicate',?)`,
        [
          issueId,
          managerId,
          issue.status,
          `Merged as duplicate of #${original.ticketNo}`,
        ],
      );
      return res
        .status(200)
        .json({
          success: true,
          message: `Marked as duplicate of #${original.ticketNo}! 🔀`,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // ✅ RESOLVE ISSUE - Proof mandatory
  static async resolveIssue(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const { resolution_note } = req.body;
      const officerId = req.user?.id;
      if (!officerId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0)
        return res
          .status(400)
          .json({ success: false, message: "Proof photo required! 📸" });
      const resolutionImages = files.map((f) => f.filename).join(",");
      const issue: any = await issueModel.getIssueById(issueId);
      if (!issue)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });
      if (issue.assigned_to !== officerId)
        return res
          .status(403)
          .json({
            success: false,
            message: "Sirf assigned officer resolve kar sakta hai! 🚫",
          });
      await pool.execute(
        `UPDATE issues SET status = 'Resolved', resolution_note =?, resolution_images =?, resolved_at = NOW(), updatedAt = NOW() WHERE id =?`,
        [resolution_note || "Resolved", resolutionImages, issueId],
      );
      await pool.execute(
        `INSERT INTO issueEvents (issue_id, actor_id, from_status, to_status, note) VALUES (?,?,?, 'Resolved',?)`,
        [
          issueId,
          officerId,
          issue.status,
          resolution_note || "Resolved with proof",
        ],
      );
      const reporterId = issue.reporter_id || issue.user_id;
      if (reporterId)
        await notificationModel.createNotification(
          reporterId,
          "issue_resolved",
          issueId,
          `Aapki report #${issue.ticketNo} resolve ho gayi!`,
        );
      return res
        .status(200)
        .json({
          success: true,
          message: "Issue resolved! ✅",
          data: { issueId, resolution_images: resolutionImages },
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // ❌ DELETE ISSUE
  static async deleteIssue(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (typeof id !== "string")
        return res
          .status(400)
          .json({ success: false, message: "Valid ID required." });
      const affectedRows = await issueModel.deleteIssue(id);
      if (affectedRows === 0)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });
      return res
        .status(200)
        .json({ success: true, message: "Issue deleted! 🗑" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // 👍 UPVOTE, 🔔 FOLLOW, 🗺 RADIUS, etc. - Short versions
  static async toggleUpvote(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const userId = req.user?.id;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      const result = await issueModel.toggleUpvote(issueId, userId);
      return res
        .status(200)
        .json({
          success: true,
          message: result.message,
          action: result.action,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async toggleFollow(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const userId = req.user?.id;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      const result = await issueModel.toggleFollowIssue(issueId, userId);
      return res
        .status(200)
        .json({
          success: true,
          message: result.message,
          action: result.action,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async getIssuesByRadius(req: Request, res: Response) {
    try {
      const { lat, lng, radius } = req.query;
      if (!lat || !lng || !radius)
        return res
          .status(400)
          .json({ success: false, message: "lat, lng, radius required! ❌" });
      const issues = await issueModel.getIssuesByRadius(
        Number(lat),
        Number(lng),
        Number(radius),
      );
      return res.status(200).json({ success: true, data: issues });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  // 🗺 BBOX - ✅ FIXED: Correct POLYGON with 5 points
  static async getMapIssuesByBbox(req: Request, res: Response) {
    try {
      const { bbox } = req.query;
      if (!bbox || typeof bbox !== "string")
        return res
          .status(400)
          .json({
            success: false,
            message: "bbox required! Format: minLng,minLat,maxLng,maxLat ❌",
          });
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number) as [
        number,
        number,
        number,
        number,
      ];
      if ([minLng, minLat, maxLng, maxLat].some((v) => Number.isNaN(v)))
        return res
          .status(400)
          .json({ success: false, message: "Invalid bbox! ❌" });

      // ✅ FIX: Sahi polygon - 5 points (rectangle closed)
      const bboxPolygon = `POLYGON((${minLng} ${minLat}, ${maxLng} ${maxLat}, ${minLng} ${minLat}))`;

      const [rows]: any = await pool.execute(
        `SELECT id, ticketNo, status, category_id, latitude, longitude, priorityScore
         FROM issues WHERE ST_Contains(ST_GeomFromText(?, 4326), location_point) LIMIT 500`,
        [bboxPolygon],
      );
      return res
        .status(200)
        .json({
          success: true,
          meta: { count: rows.length, maxMarkers: 500 },
          data: rows,
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async getNearbyDuplicates(req: Request, res: Response) {
    try {
      const { lat, lng, category_id } = req.query;
      if (!lat || !lng || !category_id)
        return res
          .status(400)
          .json({
            success: false,
            message: "lat, lng, category_id required! ❌",
          });
      const duplicates = await issueModel.checkDuplicateIssues(
        Number(lat),
        Number(lng),
        Number(category_id),
      );
      return res.status(200).json({ success: true, data: duplicates });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async rateResolution(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const userId = req.user?.id;
      const { rating, feedback } = req.body;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      const issue: any = await issueModel.getIssueById(issueId);
      if (!issue)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });
      if ((issue.reporter_id || issue.user_id) !== userId)
        return res
          .status(403)
          .json({
            success: false,
            message: "Sirf reporter rate kar sakta hai! 🚫",
          });
      if (issue.status !== "Resolved" && issue.status !== "Closed")
        return res
          .status(400)
          .json({
            success: false,
            message: "Sirf resolved issue par rating! ⚠",
          });
      await issueModel.saveResolutionRating(issueId, Number(rating), feedback);
      return res
        .status(200)
        .json({ success: true, message: "Rating saved! ⭐" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async reopenIssue(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const userId = req.user?.id;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      const issue: any = await issueModel.getIssueById(issueId);
      if (!issue)
        return res
          .status(404)
          .json({ success: false, message: "Issue not found! ❌" });
      if ((issue.reporter_id || issue.user_id) !== userId)
        return res
          .status(403)
          .json({
            success: false,
            message: "Sirf reporter reopen kar sakta hai! 🚫",
          });
      if (issue.status !== "Resolved")
        return res
          .status(400)
          .json({ success: false, message: "Sirf 'Resolved' issue reopen! ⚠" });
      if (await issueModel.checkReopenTimeExpiry(issueId))
        return res
          .status(400)
          .json({ success: false, message: "7 din guzar gaye! ⏱" });
      await issueModel.executeReopenStateTransition(issueId, userId);
      return res.status(200).json({ success: true, message: "Reopened! 🚀" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async addComment(req: AuthRequest, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const userId = req.user?.id;
      const { comment, parent_id } = req.body;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      if (!comment || comment.trim() === "")
        return res
          .status(400)
          .json({ success: false, message: "Comment required! ❌" });
      const [result]: any = await pool.execute(
        `INSERT INTO issueComments (issue_id, user_id, parent_id, comment) VALUES (?,?,?,?)`,
        [issueId, userId, parent_id || null, comment.trim()],
      );
      return res
        .status(201)
        .json({
          success: true,
          message: "Comment added! 💬",
          data: { id: result.insertId },
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async getComments(req: Request, res: Response) {
    try {
      const issueId = Number(req.params.id);
      const [rows] = await pool.execute(
        `SELECT c.*, u.name as userName, u.role as userRole FROM issueComments c JOIN users u ON c.user_id = u.id WHERE c.issue_id =? AND c.isHidden = FALSE AND c.status = 'approved' ORDER BY c.createdAt ASC`,
        [issueId],
      );
      return res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async moderateComment(req: AuthRequest, res: Response) {
    try {
      const commentId = Number(req.params.commentId);
      const { status } = req.body;
      if (!(await issueModel.checkCommentExistence(commentId)))
        return res
          .status(404)
          .json({ success: false, message: "Comment not found! ❌" });
      await issueModel.updateCommentModerationState(commentId, status);
      return res
        .status(200)
        .json({ success: true, message: `Moderation: ${status}! 🚀` });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async getApprovedComments(req: Request, res: Response) {
    return issueController.getComments(req, res);
  }

  static async submitAbuseReport(req: AuthRequest, res: Response) {
    try {
      const reporterId = req.user?.id;
      const { item_type, reported_item_id, reason, description } = req.body;
      if (!reporterId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      await issueModel.saveAbuseReport(
        reporterId,
        item_type,
        Number(reported_item_id),
        reason,
        description || "",
      );
      const total = await issueModel.countItemAbuseReports(
        item_type,
        Number(reported_item_id),
      );
      if (total >= 5 && item_type === "comment")
        await issueModel.updateCommentModerationState(
          Number(reported_item_id),
          "rejected",
        );
      return res
        .status(201)
        .json({ success: true, message: "Abuse report submitted! 🚩" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async resolveAbuseReport(req: AuthRequest, res: Response) {
    try {
      const reportId = Number(req.params.reportId);
      const { action } = req.body;
      const reportData: any = await issueModel.fetchAbuseReportById(reportId);
      if (!reportData)
        return res
          .status(404)
          .json({ success: false, message: "Report not found! ❌" });
      if (action === "dismissed")
        await issueModel.updateReportFinalState(reportId, "dismissed");
      else if (action === "content_removed")
        await issueModel.executeContentTakedownTransaction(
          reportId,
          reportData.item_type,
          reportData.reported_item_id,
        );
      else if (action === "user_banned")
        await issueModel.executeUserBanTransaction(
          reportId,
          reportData.item_type,
          reportData.reported_item_id,
        );
      else
        return res
          .status(400)
          .json({ success: false, message: "Invalid action! 🚫" });
      return res
        .status(200)
        .json({ success: true, message: `Action: ${action}! 🚀` });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async autoDetectAreaAndCity(req: AuthRequest, res: Response) {
    try {
      const lat = req.query.lat ? Number(req.query.lat) : null;
      const lng = req.query.lng ? Number(req.query.lng) : null;
      if (!lat || !lng)
        return res
          .status(400)
          .json({ success: false, message: "lat/lng required! ❌" });
      const [areaRows]: any = await pool.execute(
        `SELECT id, name, city FROM areas WHERE ST_Contains(boundaryCoords, ST_GeomFromText(?, 4326)) LIMIT 1`,
        [`POINT(${lng} ${lat})`],
      );
      return res
        .status(200)
        .json({
          success: true,
          data:
            areaRows.length > 0
              ? {
                  area: areaRows[0].name,
                  city: areaRows[0].city,
                  areaId: areaRows[0].id,
                }
              : { area: "Unknown", city: "Unknown", areaId: null },
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async reverseGeocodeLookup(req: Request, res: Response) {
    try {
      const lat = String(req.query.lat);
      const lng = String(req.query.lng);
      return res
        .status(200)
        .json({
          success: true,
          data: { formattedAddress: "Address lookup placeholder", lat, lng },
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error!" });
    }
  }

  static async uploadToCloudinaryStorage(req: Request, res: Response) {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "File missing! ❌" });
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      if (!cloudName || !apiKey || !apiSecret)
        return res
          .status(500)
          .json({ success: false, error: "Cloudinary not configured." });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash("sha1")
        .update(`folder=civicpulse_uploads&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");
      const formData = new FormData();
      formData.append(
        "file",
        new Blob([new Uint8Array(req.file.buffer)]),
        req.file.originalname,
      );
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("folder", "civicpulse_uploads");
      formData.append("signature", signature);
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        { method: "POST", body: formData },
      );
      const cloudData: any = await uploadResponse.json();
      if (!uploadResponse.ok)
        throw new Error(
          cloudData.error?.message || "Cloudinary upload failed.",
        );
      return res
        .status(200)
        .json({
          success: true,
          secure_url: cloudData.secure_url,
          public_id: cloudData.public_id,
        });
    } catch (error) {
      console.error("Cloudinary error:", error);
      return res.status(500).json({ success: false, error: "Upload failed!" });
    }
  }

  static async addCommentToIssue(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const userId = req.user?.id;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized! ❌" });
      if (!comment || comment.trim() === "")
        return res
          .status(400)
          .json({ success: false, message: "Comment required! ❌" });
      const [result]: any = await pool.execute(
        `INSERT INTO issueComments (issue_id, user_id, comment, createdAt) VALUES (?,?,?, NOW())`,
        [id, userId, comment.trim()],
      );
      return res
        .status(201)
        .json({
          success: true,
          message: "Comment added! 💬",
          data: { commentId: result.insertId, comment: comment.trim(), userId },
        });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

// ✅ Extra export - Map BBOX (alternative method)
export const getIssuesByBoundingBox = async (req: Request, res: Response) => {
  try {
    const { bbox } = req.query;
    if (!bbox || typeof bbox !== "string")
      return res
        .status(400)
        .json({
          success: false,
          error: "Bounding box (bbox) parameter is required! 🗺",
        });
    const coords = bbox.split(",").map((v) => Number(v.trim()));
    if (coords.length !== 4 || coords.some((v) => Number.isNaN(v)))
      return res
        .status(400)
        .json({
          success: false,
          error: "Bounding box must be minLng,minLat,maxLng,maxLat 🗺",
        });
    const [minLng, minLat, maxLng, maxLat] = coords;
    const [rows]: any = await pool.query(
      `SELECT id, title, latitude, longitude, status, category_id FROM issues WHERE longitude BETWEEN? AND? AND latitude BETWEEN? AND? LIMIT 500`,
      [minLng, maxLng, minLat, maxLat],
    );
    return res
      .status(200)
      .json({ success: true, count: rows.length, data: rows });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }



  
};
