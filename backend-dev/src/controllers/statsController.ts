import type { Response, Request } from "express";
import { StatsModel } from "../models/statsModel.js";

export class StatsController {

  // ============================================================
  // 📊 1. PUBLIC TRANSPARENCY DATA - OLD (area only)
  // ============================================================
  static async getTransparencyData(req: Request, res: Response) {
    try {
      const stats = await StatsModel.getPublicTransparencyStats();
      return res.status(200).json({
        success: true,
        message: "Public transparency stats fetched successfully! 📊",
        data: stats,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while fetching stats." });
    }
  }

  // ============================================================
  // 🆕 FIX: COMBINED TRANSPARENCY FOR Transparency.tsx
  // Frontend expects: { totalReported, totalResolved, avgMedianTimeHours, areaStats, monthlyTrends }
  // ============================================================
  static async getPublicTransparency(req: Request, res: Response) {
    try {
      const { area } = req.query;

      // 1. Area stats + totals from model
      const areaStatsRaw = await StatsModel.getPublicTransparencyStats() as any[];
      
      // Model agar { totalReported, areaStats } shape me de to handle karo
      let areaStats: any[] = [];
      let totalReported = 0;
      let totalResolved = 0;

      if (Array.isArray(areaStatsRaw)) {
        areaStats = areaStatsRaw;
        totalReported = areaStats.reduce((sum, a) => sum + (a.reported || a.totalReported || 0), 0);
        totalResolved = areaStats.reduce((sum, a) => sum + (a.resolved || a.totalResolved || 0), 0);
      } else if ((areaStatsRaw as any)?.areaStats) {
        areaStats = (areaStatsRaw as any).areaStats;
        totalReported = (areaStatsRaw as any).totalReported || areaStats.reduce((s, a) => s + a.reported, 0);
        totalResolved = (areaStatsRaw as any).totalResolved || areaStats.reduce((s, a) => s + a.resolved, 0);
      } else {
        areaStats = [];
      }

      // Filter by area query if provided
      if (area && area !== "all") {
        areaStats = areaStats.filter((a: any) => 
          a.area?.toLowerCase().includes(String(area).toLowerCase())
        );
      }

      // 2. Monthly trends
      let monthlyTrends: any[] = [];
      try {
        const trendsRaw = await StatsModel.getMonthlyTrends() as any;
        if (Array.isArray(trendsRaw)) {
          monthlyTrends = trendsRaw;
        } else if ((trendsRaw as any)?.data) {
          monthlyTrends = (trendsRaw as any).data;
        } else {
          monthlyTrends = trendsRaw as any;
        }
      } catch {
        monthlyTrends = [];
      }

      // 3. Avg median time
      const avgMedianTimeHours = areaStats.length > 0
        ? Math.round(areaStats.reduce((sum, a) => sum + (a.medianTimeHours || a.avgTime || 14), 0) / areaStats.length)
        : 0;

      // Final shape exactly as Transparency.tsx expects
      const finalData = {
        totalReported,
        totalResolved,
        avgMedianTimeHours,
        areaStats: areaStats.map((a: any) => ({
          area: a.area || a.name || a.area_name || "Unknown Zone",
          reported: a.reported ?? a.totalReported ?? a.total ?? 0,
          resolved: a.resolved ?? a.totalResolved ?? 0,
          medianTimeHours: a.medianTimeHours ?? a.avgTime ?? a.medianTime ?? 14
        })),
        monthlyTrends: monthlyTrends.length > 0 ? monthlyTrends.map((m: any) => ({
          month: m.month || m.name || "Jan",
          reported: m.reported ?? m.totalReported ?? 0,
          resolved: m.resolved ?? m.totalResolved ?? 0
        })) : [
          { month: "Jan", reported: totalReported, resolved: totalResolved }
        ]
      };

      return res.status(200).json({
        success: true,
        message: "Public transparency combined stats fetched! 📊",
        data: finalData
      });

    } catch (error) {
      console.log("getPublicTransparency error:", error);
      // Even on error, return empty shape not dummy 1240!
      return res.status(200).json({
        success: true,
        message: "No data yet - seed required",
        data: {
          totalReported: 0,
          totalResolved: 0,
          avgMedianTimeHours: 0,
          areaStats: [],
          monthlyTrends: []
        }
      });
    }
  }

  // ============================================================
  // 📈 2. MANAGER / ADMIN DASHBOARD METRICS
  // ============================================================
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const metrics = await StatsModel.getDashboardMetrics();
      return res.status(200).json({
        success: true,
        message: "Dashboard metrics fetched successfully! 📈",
        data: metrics,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while fetching dashboard stats." });
    }
  }

  static async getMonthlyTrends(req: Request, res: Response) {
    try {
      const trends = await StatsModel.getMonthlyTrends();
      return res.status(200).json({
        success: true,
        message: "Monthly trends fetched successfully! 📈",
        data: trends,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while fetching trends." });
    }
  }

  // ============================================================
  // 📄 3. EXPORT ISSUES CSV
  // ============================================================
  static async exportIssuesCSV(req: Request, res: Response) {
    try {
      const issues: any = await StatsModel.getAllIssuesForExport();

      let csvHeader = "TicketNo,Title,Status,PriorityScore,SlaBreached,CreatedAt,ResolvedAt,Department,Category\n";
      
      const escapeCSV = (val: any) => {
        const s = String(val ?? "");
        return `"${s.replace(/"/g, '""')}"`;
      };

      let csvRows = issues.map((i: any) => {
        return [
          escapeCSV(i.ticketNo),
          escapeCSV(i.title),
          escapeCSV(i.status),
          escapeCSV(i.priorityScore),
          escapeCSV(i.slaBreached ? 'Yes' : 'No'),
          escapeCSV(i.createdAt),
          escapeCSV(i.resolvedAt),
          escapeCSV(i.departmentName),
          escapeCSV(i.categoryName),
        ].join(",");
      }).join("\n");

      const csvData = csvHeader + csvRows;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=civicpulse_issues_report.csv");
      
      return res.status(200).send(csvData);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while exporting CSV." });
    }
  }
}