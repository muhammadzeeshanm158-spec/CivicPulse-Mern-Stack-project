import { Router } from "express";
import { StatsController } from "../controllers/statsController.js";
import { verifyToken, authorizeRoles } from "../middlewares/authMiddleware.js";

// 🛣 Express Router instance
const router = Router();

// ============================================================
// 📊 PUBLIC TRANSPARENCY STATS - FRONTEND KE LIYE FIX!
// ============================================================
// Frontend: Transparency.tsx -> GET /public/transparency call karta hai
// Isi liye ye route chahiye jo combined data de: total + areaStats + monthlyTrends

// REAL transparency endpoint - Combined response for Transparency.tsx
router.get("/public/transparency", StatsController.getPublicTransparency);

// Alias routes - koi bhi URL kaam kare
router.get("/transparency", StatsController.getPublicTransparency);
router.get("/transparency/public", StatsController.getPublicTransparency);

// Old routes - backward compat
router.get("/stats/areas", StatsController.getTransparencyData);
router.get("/stats/trends", StatsController.getMonthlyTrends);
router.get("/stats/public/transparency", StatsController.getPublicTransparency);

// ============================================================
// 📈 DASHBOARD SUMMARY METRICS - Manager/Admin only
// ============================================================
router.get(
  "/stats/dashboard",
  verifyToken,
  authorizeRoles("manager", "admin"),
  StatsController.getDashboardStats
);

// ============================================================
// 📄 CSV EXPORT - Manager/Admin
// ============================================================
router.get(
  "/stats/export.csv",
  verifyToken,
  authorizeRoles("manager", "admin"),
  StatsController.exportIssuesCSV
);

// Public CSV (agar bina auth ke chahiye to ye use karo)
router.get("/public/export.csv", StatsController.exportIssuesCSV);

export default router;