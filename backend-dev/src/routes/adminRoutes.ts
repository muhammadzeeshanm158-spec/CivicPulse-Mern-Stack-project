import { Router } from "express";
import { AdminController } from "../controllers/adminController.js";
import { verifyToken, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
  validateDepartment,
  validateCategory,
  validateArea,
} from "../validation/adminValidation.js";

const router = Router();

// ============================================================
// 🏢 DEPARTMENT ROUTES
// ============================================================
// GET — public (guest bhi dekh sakta hai)
router.get("/departments", AdminController.getDepartments);

// POST — sirf admin
router.post(
  "/departments",
  verifyToken,
  authorizeRoles("admin"),
  validateDepartment,
  AdminController.addDepartment
);

// PATCH — sirf admin
router.patch(
  "/departments/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateDepartment,
  AdminController.updateDepartment
);

// DELETE — sirf admin
router.delete(
  "/departments/:id",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.deleteDepartment
);

// ============================================================
// 🏷️ CATEGORY ROUTES
// ============================================================
// GET — public
router.get("/categories", AdminController.getCategories);

// POST — sirf admin
router.post(
  "/categories",
  verifyToken,
  authorizeRoles("admin"),
  validateCategory,
  AdminController.addCategory
);

// PATCH — sirf admin
router.patch(
  "/categories/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateCategory,
  AdminController.updateCategory
);

// DELETE — sirf admin
router.delete(
  "/categories/:id",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.deleteCategory
);

// ============================================================
// 📍 AREA ROUTES
// ============================================================
// GET — public
router.get("/areas", AdminController.getAreas);

// POST — sirf admin
router.post(
  "/areas",
  verifyToken,
  authorizeRoles("admin"),
  validateArea,
  AdminController.addArea
);

// PATCH — sirf admin
router.patch(
  "/areas/:id",
  verifyToken,
  authorizeRoles("admin"),
  validateArea,
  AdminController.updateArea
);

// DELETE — sirf admin
router.delete(
  "/areas/:id",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.deleteArea
);

// ============================================================
// 👤 USER & STAFF MANAGEMENT
// ============================================================
// Create staff — sirf admin
router.post(
  "/users",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.createStaffUser
);

// Update staff — sirf admin
router.patch(
  "/users/:id",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.updateStaffUser
);

// Toggle user status — sirf admin
router.patch(
  "/users/:id/toggle",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.toggleUser
);

// ============================================================
// 🚨 SLA ESCALATIONS
// ============================================================
// Manager + Admin dono allowed
router.get(
  "/sla-breached",
  verifyToken,
  authorizeRoles("manager", "admin"),
  AdminController.getBreachedEscalationsList
);

// ============================================================
// 📝 ACTIVITY LOGS
// ============================================================
// Sirf admin
router.get(
  "/activity-logs",
  verifyToken,
  authorizeRoles("admin"),
  AdminController.getActivityLogsQueue
);

export default router;