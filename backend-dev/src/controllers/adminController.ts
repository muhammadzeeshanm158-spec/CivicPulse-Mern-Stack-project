import  type { Request, Response } from "express";
import { AdminModel } from "../models/adminModel.js";
import type { AuthRequest } from "../middlewares/authMiddleware.js";

export class AdminController {
  
  // ============================================================
  // 🏢 1. CREATE DEPARTMENT
  // ============================================================
  static async addDepartment(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ success: false, message: "Department name is required! ❌" });

      const deptId = await AdminModel.createDepartment(name, description || "");

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "CREATE_DEPARTMENT", deptId, clientIp, `Created department: ${name}`);
      }

      return res.status(201).json({ success: true, message: "Department created successfully! 🏢", data: { id: deptId, name } });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while creating department." });
    }
  }

  // ============================================================
  // 📋 2. GET ALL DEPARTMENTS
  // ============================================================
  static async getDepartments(req: AuthRequest, res: Response) {
    try {
      const departments = await AdminModel.getAllDepartments();
      return res.status(200).json({ success: true, data: departments });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Server error." });
    }
  }

  // ============================================================
  // 🏢 2.1. UPDATE DEPARTMENT (✅ Added)
  // ============================================================
  static async updateDepartment(req: AuthRequest, res: Response) {
    try {
      const deptId = Number(req.params.id);
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ success: false, message: "Department name is required! ❌" });

      await AdminModel.updateDepartment(deptId, name, description || "");

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "UPDATE_DEPARTMENT", deptId, clientIp, `Updated department ID: ${deptId}`);
      }

      return res.status(200).json({ success: true, message: "Department updated successfully! 🏢" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while updating department." });
    }
  }

  // ============================================================
  // 🏢 2.2. DELETE DEPARTMENT (✅ Added)
  // ============================================================
  static async deleteDepartment(req: AuthRequest, res: Response) {
    try {
      const deptId = Number(req.params.id);
      await AdminModel.deleteDepartment(deptId);

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "DELETE_DEPARTMENT", deptId, clientIp, `Deleted department ID: ${deptId}`);
      }

      return res.status(200).json({ success: true, message: "Department deleted successfully! 🗑️" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while deleting department." });
    }
  }

  // ============================================================
  // 🏷️ 3. CREATE CATEGORY
  // ============================================================
  static async addCategory(req: AuthRequest, res: Response) {
    try {
      const { name, department_id, defaultSlaHours, severityLevel } = req.body;
      if (!name || !department_id) {
        return res.status(400).json({ success: false, message: "Name and department_id are required! ❌" });
      }

      const sev = severityLevel ? Number(severityLevel) : 1;
      if (sev < 1 || sev > 5) {
        return res.status(400).json({ success: false, message: "severityLevel must be between 1 and 5! ⚠️" });
      }

      const catId = await AdminModel.createCategory(
        name, 
        Number(department_id), 
        defaultSlaHours ? Number(defaultSlaHours) : 48, 
        sev
      );

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "CREATE_CATEGORY", catId, clientIp, `Created category: ${name}`);
      }

      return res.status(201).json({ success: true, message: "Category created successfully! 🏷️", data: { id: catId, name } });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while creating category." });
    }
  }

  // ============================================================
  // 📋 4. GET ALL CATEGORIES
  // ============================================================
  static async getCategories(req: AuthRequest, res: Response) {
    try {
      const categories = await AdminModel.getAllCategories();
      return res.status(200).json({ success: true, data: categories });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Server error." });
    }
  }

  // ============================================================
  // 🏷️ 4.1. UPDATE CATEGORY (✅ Added)
  // ============================================================
  static async updateCategory(req: AuthRequest, res: Response) {
    try {
      const catId = Number(req.params.id);
      const { name, department_id, defaultSlaHours, severityLevel } = req.body;

      const sev = severityLevel ? Number(severityLevel) : 1;
      if (sev < 1 || sev > 5) {
        return res.status(400).json({ success: false, message: "severityLevel must be between 1 and 5! ⚠️" });
      }

      await AdminModel.updateCategory(catId, name, Number(department_id), Number(defaultSlaHours), sev);

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "UPDATE_CATEGORY", catId, clientIp, `Updated category ID: ${catId}`);
      }

      return res.status(200).json({ success: true, message: "Category updated successfully! 🏷️" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while updating category." });
    }
  }

  // ============================================================
  // 🏷️ 4.2. DELETE CATEGORY (✅ Added)
  // ============================================================
  static async deleteCategory(req: AuthRequest, res: Response) {
    try {
      const catId = Number(req.params.id);
      await AdminModel.deleteCategory(catId);

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "DELETE_CATEGORY", catId, clientIp, `Deleted category ID: ${catId}`);
      }

      return res.status(200).json({ success: true, message: "Category deleted successfully! 🗑️" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while deleting category." });
    }
  }

  // ============================================================
  // 📍 5. CREATE AREA
  // ============================================================
static async addArea(req: AuthRequest, res: Response) {
  try {
    const { name, city, boundaryCoords } = req.body;
    if (!name || !city) {
      return res.status(400).json({ success: false, message: "Name and city are required! 📍" });
    }

    const areaId = await AdminModel.createArea(name, city, boundaryCoords || null);
    //                                                              ^^^^ null bhejo

    // 📝 Activity log
    const adminId = req.user?.id;
    const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
    if (adminId) {
      await AdminModel.logAdminAction(adminId, "CREATE_AREA", areaId, clientIp, `Created area: ${name}`);
    }

    return res.status(201).json({ success: true, message: "Area created successfully! 🗺️", data: { id: areaId, name } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: "Server error." });
  }
}

  // ============================================================
  // 🗺️ 6. GET ALL AREAS
  // ============================================================
  static async getAreas(req: AuthRequest, res: Response) {
    try {
      const areas = await AdminModel.getAllAreas();
      return res.status(200).json({ success: true, data: areas });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Server error." });
    }
  }

  // ============================================================
  // 📍 6.1. UPDATE AREA (✅ Added)
  // ============================================================
static async updateArea(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, city, boundaryCoords } = req.body;

    const affected = await AdminModel.updateArea(
      Number(id),
      name,
      city,
      boundaryCoords !== undefined ? boundaryCoords : undefined  // ✅ undefined handle karo
    );

    if (affected === 0) {
      return res.status(404).json({ success: false, message: "Area not found!" });
    }

    return res.status(200).json({
      success: true,
      message: "Area updated successfully! 🗺️",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: "Server error." });
  }
}

  // ============================================================
  // 📍 6.2. DELETE AREA (✅ Added)
  // ============================================================
  static async deleteArea(req: AuthRequest, res: Response) {
    try {
      const areaId = Number(req.params.id);
      await AdminModel.deleteArea(areaId);

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "DELETE_AREA", areaId, clientIp, `Deleted area ID: ${areaId}`);
      }

      return res.status(200).json({ success: true, message: "Area deleted successfully! 🗑️" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while deleting area." });
    }
  }

  // ============================================================
  // 👤 6.3. CREATE STAFF USER (✅ Added)
  // ============================================================
  static async createStaffUser(req: AuthRequest, res: Response) {
    try {
      const { name, email, password, role, department_id, area_id } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).json({ success: false, message: "Name, email, password, and role are required! ❌" });
      }

      const staffId = await AdminModel.createStaffUser({ name, email, password, role, department_id, area_id });

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "CREATE_STAFF_USER", staffId, clientIp, `Created staff user: ${email} with role ${role}`);
      }

      return res.status(201).json({ success: true, message: "Staff user created successfully! 👤", data: { id: staffId, email, role } });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while creating staff user." });
    }
  }

  // ============================================================
  // 👤 6.4. UPDATE STAFF USER (✅ Added)
  // ============================================================
  static async updateStaffUser(req: AuthRequest, res: Response) {
    try {
      const staffId = Number(req.params.id);
      const updates = req.body;

      await AdminModel.updateStaffUser(staffId, updates);

      const adminId = req.user?.id;
      const clientIp = req.ip || req.socket.remoteAddress || "Unknown";
      if (adminId) {
        await AdminModel.logAdminAction(adminId, "UPDATE_STAFF_USER", staffId, clientIp, `Updated staff user ID: ${staffId}`);
      }

      return res.status(200).json({ success: true, message: "Staff user updated successfully! 👤" });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Server error while updating staff user." });
    }
  }

  // ============================================================
  // 🚨 7. SLA BREACHED ESCALATIONS LIST
  // ============================================================
  static async getBreachedEscalationsList(req: Request, res: Response) {
    try {
      const escalatedIssuesData = await AdminModel.fetchSLABreachedEscalatedRecords();

      return res.status(200).json({
        success: true,
        message: "Critical SLA escalated management records queue successfully loaded! 📊🚨",
        meta: { count: escalatedIssuesData.length },
        data: escalatedIssuesData
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Internal administrative control dashboard queries failed." });
    }
  }

  // ============================================================
  // 👤 8. TOGGLE USER STATUS
  // ============================================================
  static async toggleUser(req: AuthRequest, res: Response) {
    try {
      const userId = Number(req.params.id);
      const { isActive } = req.body;
      const adminId = req.user?.id;

      if (!adminId) return res.status(401).json({ success: false, message: "Unauthorized credentials!" });
      if (isActive === undefined) return res.status(400).json({ success: false, message: "isActive status is required! ❌" });

      await AdminModel.toggleUserStatus(userId, Boolean(isActive));

      const clientIp = req.ip || req.socket.remoteAddress || "Unknown IP";
      await AdminModel.logAdminAction(adminId, "TOGGLE_USER_STATUS", userId, clientIp, `Updated user status to: ${isActive}`);

      return res.status(200).json({ success: true, message: `User status updated successfully! 👤` });
    } catch (error) {
      return res.status(500).json({ success: false, error: "Server error." });
    }
  }

  // ============================================================
  // 🛡️ 9. ACTIVITY LOGS QUEUE
  // ============================================================
  static async getActivityLogsQueue(req: Request, res: Response) {
    try {
      const adminIdFilter = req.query.admin_id ? Number(req.query.admin_id) : null;
      const actionFilter = req.query.action_type ? String(req.query.action_type).trim() : null;
      
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = (page - 1) * limit;

      const logRecords = await AdminModel.fetchFilteredActivityLogs(adminIdFilter, actionFilter, limit, offset);
      const totalLogCount = await AdminModel.getActivityLogsCount(adminIdFilter, actionFilter); // ✅ Total count included

      return res.status(200).json({
        success: true,
        message: "Administrative security logging audit trail history successfully pulled! 📊🛡️",
        meta: { 
          page, 
          limit, 
          count: logRecords.length,
          totalCount: totalLogCount,
        },
        data: logRecords
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, error: "Administrative trace history reporting service modules failed." });
    }
  }
}