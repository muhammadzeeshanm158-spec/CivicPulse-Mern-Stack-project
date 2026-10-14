import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js"; // Aapka database pool

// 🚨 CRITICAL FIX: JWT_SECRET hardcoded nahi hona chahiye.
// .env se load karo. PDF mein "secrets committed to repo" = AUTOMATIC FAIL condition.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET environment variable is not set! Server cannot start.");
}

// 📝 Express Request interface extend — user object add karne ke liye
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string; 
  };
}

// Alias used by downstream middleware in this file.
export type AuthenticatedRequest = AuthRequest;

// ============================================================
// 🔑 1. TOKEN VERIFICATION MIDDLEWARE
// ============================================================
// Protected routes par access allow karne se pehle JWT validate karta hai.
// Token format: "Bearer <jwt>"
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied! No token provided. ❌",
      });
    }

    const token = authHeader.slice("Bearer ".length).trim();

    // Secret key se token verify
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & { id: number; email: string; role: string };

    // ⚠️ NOTE: Yeh `id` field hai — check karo ke generateAccessToken bhi `id` set karta hai
    // (kuch log `userId` set karte hain — mismatch ho jayega)
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token! 🚫",
    });
  }
};

// ============================================================
// 🛡️ 2. ADMIN VERIFICATION MIDDLEWARE
// ============================================================
// 🚨 CRITICAL BUG: Yeh role `"Admin"` (capital A) check kar raha hai.
// Lekin aapki userModel.ts mein default role `"admin"` (lowercase) hai!
// Aur register route mein `"citizen"` (lowercase) set ho raha hai.
//
// Agar aapka DB lowercase store karta hai to koi bhi admin is middleware
// se pass NAHI hoga — poori admin functionality toot jayegi.
//
// FIX: Sab lowercase use karo (consistency ke liye):
export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized request! Token missing or invalid. ❌" 
    });
  }

  // ✅ FIX: lowercase "admin" — DB ke saath consistent
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({ 
      success: false, 
      message: "Access denied! Only admins can perform this action. 🚫" 
    });
  }

  next();
};

// ============================================================
// 👥 3. ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================
// Multiple allowed roles ko dynamic check karne ke liye.
// e.g. authorizeRoles("manager", "officer")
//
// ⚠️ Case-sensitivity: `toLowerCase()` use karo taake "Manager" vs "manager" mismatch na ho.
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    // ✅ Case-insensitive comparison
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    const normalizedUserRole = userRole?.toLowerCase();

    if (!normalizedUserRole || !normalizedAllowed.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied! You do not have permission to perform this action. 🚫",
      });
    }

    next();
  };
};





// ============================================================
// 1️⃣ VERIFY OWNER MIDDLEWARE (Citizen sirf apna issue edit/delete kare)
// ============================================================
export const verifyOwner = (table: string, foreignKeyColumn: string = "user_id") => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const resourceIdParam = req.params.id;
      const resourceId = Array.isArray(resourceIdParam) ? resourceIdParam[0] : resourceIdParam;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!resourceId) {
        return res.status(400).json({ success: false, error: "Resource id is required. ❌" });
      }

      // Agar user Admin ya Manager hai, toh bypass kar sakte hain
      if (userRole?.toLowerCase() === "admin" || userRole?.toLowerCase() === "manager") {
        return next();
      }

      const query = `SELECT ${foreignKeyColumn} FROM ${table} WHERE id = ?`;
      const [rows]: any = await pool.execute(query, [resourceId]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: "Resource not found! ❌" });
      }

      if (rows[0][foreignKeyColumn] !== userId) {
        return res.status(403).json({ success: false, error: "Forbidden! You do not own this resource. 🚫" });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  };
};

// ============================================================
// 2️⃣ IS ACCOUNT ACTIVE MIDDLEWARE (Deactivated users ko live block karo)
// ============================================================
export const isAccountActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized! No user found in request." });
    }

    const [rows]: any = await pool.execute("SELECT isActive FROM users WHERE id = ?", [userId]);

    if (rows.length === 0 || rows[0].isActive === 0 || rows[0].isActive === false) {
      return res.status(403).json({ success: false, error: "Your account has been deactivated by the admin. 🛑" });
    }

    next();
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 3️⃣ CHECK TOKEN BLACKLIST MIDDLEWARE (Redis / DB check for logout)
// ============================================================
// Note: Agar aap Redis use kar rahe hain toh client.get() karenge. 
// Yahan hum database/memory ya Redis standard pattern use kar sakte hain.
export const checkTokenBlacklist = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const token = authHeader.split(" ")[1];

    // Agar aap Redis use kar rahe hain:
    // const isBlacklisted = await redisClient.get(`blacklist_${token}`);
    // if (isBlacklisted) {
    //   return res.status(401).json({ success: false, error: "Token is invalidated (Logged out). Please login again." });
    // }

    // Filhal placeholder logic (Redis client ke sath connect hone par enable hoga)
    next();
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 🛡️️ ISSUE OWNERSHIP CHECK MIDDLEWARE
// ============================================================
export const verifyIssueOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issueIdParam = req.params.id;
    const issueId = Array.isArray(issueIdParam) ? issueIdParam[0] : issueIdParam;

    if (!issueId) {
      return res.status(400).json({ success: false, error: "Issue id is required. ❌" });
    }

    const parsedIssueId = Number(issueId);
    if (!Number.isInteger(parsedIssueId) || parsedIssueId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid issue id. ❌" });
    }

    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // 1. Agar user Admin ya Manager hai, toh woh koi bhi issue modify kar sakta hai
    if (["admin", "manager"].includes(String(userRole ?? "").toLowerCase())) {
      return next();
    }

    // 2. Database se check karo ke yeh issue kis user ka banaya hua hai
    const [rows]: any = await pool.execute("SELECT user_id FROM issues WHERE id = ?", [parsedIssueId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Issue not found. ❌" });
    }

    // 3. Agar logged-in user issue ka creator nahi hai, toh access deny kardo
    if (rows[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: You do not have permission to modify this issue. 🚫"
      });
    }

    next();
  } catch (error) {
    console.error("Ownership check error:", error);
    return res.status(500).json({ success: false, error: "Internal server error during authorization." });
  }
};