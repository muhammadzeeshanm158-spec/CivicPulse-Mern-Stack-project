import pool from "../config/db.js";
import bcrypt from "bcrypt";

export class userModel {

  // ============================================================
  // 🔍 1. FIND BY EMAIL
  // ============================================================
  // Login aur duplicate check ke liye.
  static async findByEmail(email: string) {
    const [rows]: any = await pool.execute(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // ============================================================
  // 🔍 2. FIND BY ID (Safe fields — password exclude)
  // ============================================================
  // Profile aur getMe ke liye.
  static async findById(id: number) {
    const [rows]: any = await pool.execute(
      `SELECT id, name, email, role, department_id, area_id, 
              phone, avatarUrl, isVerified, isActive, createdAt 
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // ============================================================
  // 📝 3. CREATE USER
  // ============================================================
  // Password **already hashed** hona chahiye (controller mein bcrypt.hash ke baad aata hai).
  static async createUser(
    name: string,
    email: string,
    hashedPassword: string,
    role: string,
    department_id: number | null,
    area_id: number | null
  ) {
    const [result]: any = await pool.execute(
      `INSERT INTO users (name, email, password, role, department_id, area_id, isVerified) 
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [name, email, hashedPassword, role, department_id, area_id]
    );
    return result.insertId;
  }

  // ============================================================
  // 🔄 4. UPDATE REFRESH TOKEN
  // ============================================================
static async updateRefreshToken(userId: number, refreshToken: string | null) {
  const expiresAt = refreshToken
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    : null;

  await pool.execute(
    "UPDATE users SET refreshToken = ?, tokenExpiresAt = ? WHERE id = ?",
    [refreshToken, expiresAt, userId]
  );
}

  // ============================================================
  // 🔎 5. FIND BY REFRESH TOKEN (✅ ADD — MISSING THA)
  // ============================================================
  static async findByRefreshToken(token: string) {
    const [rows]: any = await pool.execute(
      "SELECT * FROM users WHERE refreshToken = ? AND tokenExpiresAt > NOW()",
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // ============================================================
  // 🔍 6. CHECK ACTIVE OTP (✅ ADD — MISSING THA)
  // ============================================================
  // Email verification ke liye: check karta hai ke OTP valid hai,
  // use nahi hua, aur expire nahi hua.
  static async checkActiveOTP(userId: number, email: string, token: string): Promise<boolean> {
    const [rows]: any = await pool.execute(
      `SELECT id FROM email_verifications 
       WHERE user_id = ? AND email = ? AND token = ? AND is_used = FALSE AND expires_at > NOW()`,
      [userId, email, token]
    );
    return rows.length > 0;
  }

  // ============================================================
  // 🔄 7. ACTIVATE VERIFICATION (✅ ADD — MISSING THA)
  // ============================================================
  // Transaction-safe: user ko verified mark + OTP used mark.
  static async activateVerificationState(userId: number, token: string) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        "UPDATE users SET isVerified = TRUE WHERE id = ?",
        [userId]
      );

      await connection.execute(
        "UPDATE email_verifications SET is_used = TRUE WHERE user_id = ? AND token = ?",
        [userId, token]
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
  // 📝 8. SAVE RESET TOKEN
  // ============================================================
  // Forgot password ke liye reset token save karta hai (15 min valid).
  static async saveResetTokenRecord(email: string, token: string) {
    // Purane tokens clear karo
    await pool.execute("DELETE FROM password_resets WHERE email = ?", [email]);
    
    await pool.execute(
      `INSERT INTO password_resets (email, token, expires_at) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [email, token]
    );
  }

  // ============================================================
  // 🔍 9. FIND VALID RESET TOKEN (✅ ADD — MISSING THA)
  // ============================================================
  static async findValidResetToken(token: string) {
    const [rows]: any = await pool.execute(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // ============================================================
  // 🔄 10. EXECUTE PASSWORD RECOVERY (✅ ADD — MISSING THA)
  // ============================================================
  // Transaction-safe: password update + reset token delete.
  static async executePasswordRecoveryClearance(
    email: string,
    hashedPassword: string,
    token: string
  ) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        "UPDATE users SET password = ? WHERE email = ?",
        [hashedPassword, email]
      );

      await connection.execute(
        "DELETE FROM password_resets WHERE token = ?",
        [token]
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
  // 👤 11. GET PROFILE (Safe fields — password exclude)
  // ============================================================
  static async getProfile(userId: number) {
    const [rows]: any = await pool.execute(
      `SELECT id, name, email, role, department_id, area_id, 
              phone, avatarUrl, isVerified, isActive, createdAt 
       FROM users WHERE id = ?`,
      [userId]
    );
    return rows[0];
  }

  // ============================================================
  // ✏️ 12. UPDATE PROFILE
  // ============================================================
  static async updateProfile(
    userId: number,
    updates: { name?: string; phone?: string; avatarUrl?: string; area_id?: number }
  ) {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return 0;
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    const [result]: any = await pool.execute(query, values);
    return result.affectedRows;
  }
}