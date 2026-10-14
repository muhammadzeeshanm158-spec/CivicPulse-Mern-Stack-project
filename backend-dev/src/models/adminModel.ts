import pool from "../config/db.js";

export class AdminModel {
  // 🏢 --- Departments CRUD (Naye departments banana aur manage karna) ---

  // 📝 Naya department database mein add karne ke liye
  static async createDepartment(name: string, description: string) {
    const [result]: any = await pool.execute(
      "INSERT INTO departments (name, description) VALUES (?, ?)",
      [name, description]
    );
    return result.insertId;
  }

  // 📋 Saare departments ki list alphabetically (A-Z) mangwane ke liye
  static async getAllDepartments() {
    const [rows] = await pool.execute("SELECT * FROM departments ORDER BY name ASC");
    return rows;
  }

  // 🏢 Update Department
  static async updateDepartment(id: number, name: string, description: string) {
    const [result]: any = await pool.execute(
      "UPDATE departments SET name = ?, description = ? WHERE id = ?",
      [name, description, id]
    );
    return result.affectedRows;
  }

  // 🏢 Delete Department
  static async deleteDepartment(id: number) {
    const [result]: any = await pool.execute(
      "DELETE FROM departments WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  // 🗂️ --- Categories CRUD (Issues ki categories manage karne ke liye) ---

  // 📝 Nayi category database mein insert karne ke liye
  static async createCategory(name: string, department_id: number, defaultSlaHours: number, severityLevel: number) {
    const [result]: any = await pool.execute(
      "INSERT INTO categories (name, department_id, defaultSlaHours, severityLevel) VALUES (?, ?, ?, ?)",
      [name, department_id, defaultSlaHours, severityLevel]
    );
    return result.insertId;
  }

  // 🔍 Saare categories ka data unke department ke naam ke sath lane ke liye
  static async getAllCategories() {
    const query = `
      SELECT c.*, d.name as departmentName 
      FROM categories c 
      JOIN departments d ON c.department_id = d.id 
      ORDER BY c.name ASC
    `;
    const [rows] = await pool.execute(query);
    return rows;
  }

  // 🏷️ Update Category
  static async updateCategory(id: number, name: string, department_id: number, defaultSlaHours: number, severityLevel: number) {
    const [result]: any = await pool.execute(
      "UPDATE categories SET name = ?, department_id = ?, defaultSlaHours = ?, severityLevel = ? WHERE id = ?",
      [name, department_id, defaultSlaHours, severityLevel, id]
    );
    return result.affectedRows;
  }

  // 🏷️️ Delete Category
  static async deleteCategory(id: number) {
    const [result]: any = await pool.execute(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  // 📍 --- Areas CRUD (Zilay ya Ilaqe manage karne ke liye) ---

  // 📝 Naya area aur uske boundary coordinates save karne ke liye
static async createArea(name: string, city: string, boundaryCoords: string | null) {
  // ✅ Agar boundaryCoords null hai to NULL bhejo, warna ST_GeomFromText use karo
  if (boundaryCoords) {
    const [result]: any = await pool.execute(
      `INSERT INTO areas (name, city, boundaryCoords) VALUES (?, ?, ST_GeomFromText(?))`,
      [name, city, boundaryCoords]
    );
    return result.insertId;
  } else {
    // ✅ boundaryCoords NULL bhejo
    const [result]: any = await pool.execute(
      `INSERT INTO areas (name, city) VALUES (?, ?)`,
      [name, city]
    );
    return result.insertId;
  }
}

  // 🗺️ Saare save kiye hue areas ki list A-Z order mein mangwane ke liye
  static async getAllAreas() {
    const [rows] = await pool.execute("SELECT * FROM areas ORDER BY name ASC");
    return rows;
  }
// 📍update  area
static async updateArea(
  id: number,
  name?: string,
  city?: string,
  boundaryCoords?: string | null
) {
  const fields: string[] = [];
  const values: any[] = [];

  if (name !== undefined) {
    fields.push("name = ?");
    values.push(name);
  }
  if (city !== undefined) {
    fields.push("city = ?");
    values.push(city);
  }
  if (boundaryCoords !== undefined) {
    fields.push("boundaryCoords = ?");
    values.push(boundaryCoords);
  }

  if (fields.length === 0) return 0;
  values.push(id);

  const query = `UPDATE areas SET ${fields.join(", ")} WHERE id = ?`;
  const [result]: any = await pool.execute(query, values);
  return result.affectedRows;
}

  // 📍 Delete Area
  static async deleteArea(id: number) {
    const [result]: any = await pool.execute(
      "DELETE FROM areas WHERE id = ?",
      [id]
    );
    return result.affectedRows;
  }

  // 👤 --- Staff User Management ---
  static async createStaffUser(userData: { name: string; email: string; password: string; role: string; department_id?: number; area_id?: number }) {
    const { name, email, password, role, department_id, area_id } = userData;
    const [result]: any = await pool.execute(
      "INSERT INTO users (name, email, password, role, department_id, area_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, password, role, department_id || null, area_id || null]
    );
    return result.insertId;
  }

  static async updateStaffUser(id: number, updates: Record<string, any>) {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return 0;
    values.push(id);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    const [result]: any = await pool.execute(query, values);
    return result.affectedRows;
  }

  // 👥 --- User Deactivation (Admin control) ---
  static async toggleUserStatus(userId: number, isActive: boolean) {
    const [result]: any = await pool.execute(
      "UPDATE users SET isActive = ? WHERE id = ?",
      [isActive, userId]
    );
    return result.affectedRows;
  }

  // 🛡️ Spatial and geometry helpers
  static async createSpatialAreaGeometryRecord(name: string, city: string, wktString: string) {
    const query = `
      INSERT INTO areas (name, city, boundaryCoords) 
      VALUES (?, ?, ST_GeomFromText(?))
    `;
    const [result]: any = await pool.execute(query, [name, city, wktString]);
    return result.insertId;
  }

  static async checkPointInsideOperationalPolygons(lat: number, lng: number) {
    const wktPointInput = `POINT(${lng} ${lat})`;
    const query = `
      SELECT id, name, city FROM areas 
      WHERE ST_Contains(boundaryCoords, ST_GeomFromText(?)) 
      LIMIT 1
    `;
    const [rows]: any = await pool.execute(query, [wktPointInput]);
    return rows.length > 0 ? rows[0] : null;
  }

  // 🔍 Fetch active escalated data structures
  static async fetchSLABreachedEscalatedRecords() {
    const query = `
      SELECT id, ticketNo, title, status, priorityScore, deadline, assigned_to, createdAt 
      FROM issues 
      WHERE slaBreached = TRUE 
      ORDER BY priorityScore DESC, deadline ASC
    `;
    const [rows] = await pool.execute(query);
    return rows as any[];
  }

  // 📝 Admin activity logs
  static async logAdminAction(adminId: number, action: string, targetId: number | null, ip: string, details: string) {
    const query = `
      INSERT INTO admin_activity_logs (admin_id, action, target_id, ip_address, details) 
      VALUES (?, ?, ?, ?, ?)
    `;
    return await pool.execute(query, [adminId, action, targetId, ip, details]);
  }

  // 🔍 Filters & Pagination logic query builder on activity logs
  static async fetchFilteredActivityLogs(adminId: number | null, actionType: string | null, limit: number, offset: number) {
    let baseSql = `
      SELECT l.*, u.name as adminName, u.email as adminEmail 
      FROM admin_activity_logs l
      JOIN users u ON l.admin_id = u.id 
      WHERE 1=1
    `;
    let bindings: any[] = [];

    if (adminId) {
      baseSql += " AND l.admin_id = ?";
      bindings.push(adminId);
    }
    if (actionType) {
      baseSql += " AND l.action = ?";
      bindings.push(actionType);
    }

    baseSql += " ORDER BY l.createdAt DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    const [rows] = await pool.execute(baseSql, bindings);
    return rows as any[];
  }

  // 📊 Get Activity Logs Count for Pagination
  static async getActivityLogsCount(adminIdFilter: number | null, actionFilter: string | null) {
    let baseSql = `
      SELECT COUNT(*) as total 
      FROM admin_activity_logs l 
      WHERE 1=1
    `;
    let bindings: any[] = [];

    if (adminIdFilter) {
      baseSql += " AND l.admin_id = ?";
      bindings.push(adminIdFilter);
    }
    if (actionFilter) {
      baseSql += " AND l.action = ?";
      bindings.push(actionFilter);
    }

    const [rows]: any = await pool.execute(baseSql, bindings);
    return rows[0].total;
  }
}