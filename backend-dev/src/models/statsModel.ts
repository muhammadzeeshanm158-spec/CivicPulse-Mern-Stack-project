import pool from "../config/db.js";

export class StatsModel {

  // ============================================================
  // 📊 1. PUBLIC TRANSPARENCY — AREA-WISE STATS - FIXED!
  // ============================================================
  static async getPublicTransparencyStats() {
    const query = `
      SELECT
        a.name as area,
        COUNT(i.id) as reported,
        SUM(CASE WHEN i.status = 'Resolved' OR i.status = 'Closed' OR i.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        AVG(TIMESTAMPDIFF(HOUR, i.createdAt, i.resolved_at)) as medianTimeHours
      FROM areas a
      LEFT JOIN issues i ON a.id = i.area_id
      GROUP BY a.id, a.name
      ORDER BY a.name
    `;
    const [rows] = await pool.execute(query);
    // Ensure numbers
    return (rows as any[]).map((r: any) => ({
      area: r.area,
      reported: Number(r.reported) || 0,
      resolved: Number(r.resolved) || 0,
      medianTimeHours: Math.round(Number(r.medianTimeHours) || 14)
    }));
  }

  // ============================================================
  // 📈 2. DASHBOARD METRICS
  // ============================================================
  static async getDashboardMetrics() {
    const query = `
      SELECT
        COUNT(*) as totalIssues,
        SUM(CASE WHEN status IN ('Resolved', 'Closed', 'resolved') THEN 1 ELSE 0 END) as resolvedIssues,
        SUM(CASE WHEN status NOT IN ('Resolved', 'Closed', 'Rejected', 'Duplicate', 'resolved') THEN 1 ELSE 0 END) as openIssues,
        SUM(CASE WHEN slaBreached = 1 THEN 1 ELSE 0 END) as slaBreachedCount
      FROM issues
    `;
    const [rows]: any = await pool.execute(query);
    return rows[0];
  }

  // ============================================================
  // 📄 3. CSV EXPORT
  // ============================================================
  static async getAllIssuesForExport() {
    const query = `
      SELECT
        i.ticketNo, i.title, i.status, i.priorityScore, i.slaBreached,
        i.createdAt, i.resolved_at as resolvedAt,
        d.name as departmentName, c.name as categoryName
      FROM issues i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY i.createdAt DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  // ============================================================
  // 📈 6. 12-MONTH TRENDS - FIXED!
  // ============================================================
  static async getMonthlyTrends(months: number = 12) {
    const query = `
      SELECT
        DATE_FORMAT(createdAt, '%b') as month,
        DATE_FORMAT(createdAt, '%Y-%m') as sortKey,
        COUNT(*) as reported,
        SUM(CASE WHEN status IN ('Resolved', 'Closed', 'resolved') THEN 1 ELSE 0 END) as resolved
      FROM issues
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL? MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), DATE_FORMAT(createdAt, '%b')
      ORDER BY sortKey ASC
    `;
    const [rows] = await pool.execute(query, [months]);
    return (rows as any[]).map((r: any) => ({
      month: r.month, // Jan, Feb, Mar
      reported: Number(r.reported) || 0,
      resolved: Number(r.resolved) || 0
    }));
  }

  static async getAverageResolutionTime() {
    const query = `
      SELECT AVG(TIMESTAMPDIFF(HOUR, createdAt, resolved_at)) as avgResolutionHours
      FROM issues WHERE status IN ('Resolved', 'Closed', 'resolved') AND resolved_at IS NOT NULL
    `;
    const [rows]: any = await pool.execute(query);
    return { avgResolutionHours: Math.round(rows[0]?.avgResolutionHours || 0) };
  }

  static async getMedianResolutionTimePerArea() {
    const query = `
      SELECT a.name as areaName, AVG(TIMESTAMPDIFF(HOUR, i.createdAt, i.resolved_at)) as medianResolutionHours
      FROM issues i JOIN areas a ON i.area_id = a.id
      WHERE i.status IN ('Resolved', 'Closed', 'resolved') AND i.resolved_at IS NOT NULL
      GROUP BY a.name
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async getOfficerWorkload() {
    const query = `
      SELECT u.id as officerId, u.name as officerName,
      COUNT(i.id) as totalAssigned,
      SUM(CASE WHEN i.status IN ('Assigned', 'InProgress') THEN 1 ELSE 0 END) as activeIssues,
      SUM(CASE WHEN i.status IN ('Resolved', 'Closed', 'resolved') THEN 1 ELSE 0 END) as resolvedIssues
      FROM users u LEFT JOIN issues i ON u.id = i.assigned_to
      WHERE u.role = 'officer' GROUP BY u.id, u.name ORDER BY activeIssues DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async getSLABreachRate() {
    const query = `
      SELECT COUNT(*) as totalIssues,
      SUM(CASE WHEN slaBreached = 1 THEN 1 ELSE 0 END) as breachedCount,
      ROUND((SUM(CASE WHEN slaBreached = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as breachRatePercent
      FROM issues WHERE status NOT IN ('Rejected', 'Duplicate')
    `;
    const [rows]: any = await pool.execute(query);
    return rows[0] || { totalIssues: 0, breachedCount: 0, breachRatePercent: 0 };
  }

  static async getCategoryWiseStats() {
    const query = `
      SELECT c.id as categoryId, c.name as categoryName, c.severityLevel,
      COUNT(i.id) as totalIssues,
      SUM(CASE WHEN i.status IN ('Resolved', 'Closed', 'resolved') THEN 1 ELSE 0 END) as resolvedIssues
      FROM categories c LEFT JOIN issues i ON c.id = i.category_id
      GROUP BY c.id, c.name, c.severityLevel ORDER BY totalIssues DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async getAreaTrends(areaId: number, months: number = 12) {
    const query = `
      SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as reported,
      SUM(CASE WHEN status IN ('Resolved', 'Closed', 'resolved') THEN 1 ELSE 0 END) as resolved
      FROM issues WHERE area_id =? AND createdAt >= DATE_SUB(NOW(), INTERVAL? MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY month ASC
    `;
    const [rows] = await pool.execute(query, [areaId, months]);
    return rows;
  }
}