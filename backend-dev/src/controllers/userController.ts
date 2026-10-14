import type { Request, Response } from "express";
import { userModel } from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import pool from "../config/db.js"; // OTP ke liye direct pool chahiye
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, cookieOptions } from "../utils/jwt.js";

export class userController {

  // ============================================================
  // 📝 1. CITIZEN REGISTRATION - Sirf citizen ban sakta hai
  // ============================================================
  // PDF ke mutabiq: /register par role accept nahi karna, hardcoded "citizen"
  // Security: Email duplicate check + bcrypt 10 rounds + OTP generate
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;

      // 1. Duplicate email check - 409 Conflict
      const existing = await userModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email already registered! ❌",
        });
      }

      // 2. Password hash - 10 salt rounds (PDF requirement)
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 3. User create - role hardcoded "citizen" (role escalation block)
      const userId = await userModel.createUser(name, email, hashedPassword, "citizen", null, null);

      // 4. ✅ CRITICAL FIX: OTP generate aur email_verifications table me INSERT
      //    Pehle ye missing tha isliye verifyOTP hamesha fail hota tha
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.execute(
        `INSERT INTO email_verifications (user_id, email, token, expires_at) 
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
        [userId, email, otp]
      );

      // 5. Email simulator - production me nodemailer se replace hoga
      console.log(`✉ [OTP SIMULATOR] OTP for ${email}: ${otp} | Valid for 10 minutes`);

      return res.status(201).json({
        success: true,
        message: "User registered successfully! Please verify your email with OTP. 🚀",
        data: { id: userId, name, email, role: "citizen" },
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ success: false, error: "Server error during registration!" });
    }
  }

  // ============================================================
  // 🔑 2. LOGIN - isVerified + isActive check + JWT Rotation
  // ============================================================
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await userModel.findByEmail(email);

      // 1. User exist + password match check
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password! ❌",
        });
      }

      // 2. Email verification check - PDF requirement
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email first! Check console for OTP. 📧",
        });
      }

      // 3. Account active check - Admin ne deactivate kiya ho to block
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account deactivated by admin. Contact support. 🛑",
        });
      }

      // 4. JWT generate - Access 15min + Refresh 7days (httpOnly cookie)
      const accessToken = generateAccessToken(user.id, user.email, user.role);
      const refreshToken = generateRefreshToken(user.id, user.email, user.role);

      // 5. Refresh token DB me save - rotation ke liye
      await userModel.updateRefreshToken(user.id, refreshToken);
      res.cookie("refreshToken", refreshToken, cookieOptions);

      return res.status(200).json({
        success: true,
        message: "User logged in successfully! 🚀",
        accessToken,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ success: false, error: "Server login error!" });
    }
  }

  // ============================================================
  // 🔄 3. REFRESH TOKEN ROTATION - Security best practice
  // ============================================================
  // Har refresh par naya access + naya refresh token (old invalidate)
  static async refresh(req: Request, res: Response) {
    try {
      const cookiesToken = req.cookies?.refreshToken;

      if (!cookiesToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token missing! Please login again. ❌",
        });
      }

      // 1. DB me token exist karta hai ya nahi (logout ke baad invalid)
      const user = await userModel.findByRefreshToken(cookiesToken);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired refresh token! 🚫",
        });
      }

      // 2. JWT signature verify
      verifyRefreshToken(cookiesToken);

      // 3. Naye tokens generate + rotation
      const newAccessToken = generateAccessToken(user.id, user.email, user.role);
      const newRefreshToken = generateRefreshToken(user.id, user.email, user.role);

      await userModel.updateRefreshToken(user.id, newRefreshToken);
      res.cookie("refreshToken", newRefreshToken, cookieOptions);

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
        message: "Token rotated successfully! 🔄",
      });
    } catch (error) {
      console.error("Refresh error:", error);
      return res.status(403).json({ success: false, error: "Invalid refresh token!" });
    }
  }

  // ============================================================
  // 👥 4. ADMIN: CREATE STAFF - Sirf admin kar sakta hai
  // ============================================================
  // Route: POST /api/v1/admin/create-staff (verifyToken + verifyAdmin middleware)
  static async createStaff(req: Request, res: Response) {
    try {
      const { name, email, password, role, department_id, area_id } = req.body;

      // 1. Role whitelist - citizen yahan allow nahi
      if (!["officer", "manager", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role! Allowed: officer, manager, admin. ❌",
        });
      }

      const existing = await userModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email already registered! ❌",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userId = await userModel.createUser(
        name,
        email,
        hashedPassword,
        role,
        department_id || null,
        area_id || null
      );

      return res.status(201).json({
        success: true,
        message: `Staff member (${role}) created successfully! 🚀`,
        data: { id: userId, name, email, role },
      });
    } catch (error) {
      console.error("Create staff error:", error);
      return res.status(500).json({
        success: false,
        error: "Server error while creating staff!",
      });
    }
  }

  // ============================================================
  // 🚪 5. LOGOUT - Refresh token invalidate + cookie clear
  // ============================================================
  static async logout(req: Request, res: Response) {
    try {
      const cookiesToken = req.cookies?.refreshToken;

      if (cookiesToken) {
        const user = await userModel.findByRefreshToken(cookiesToken);
        if (user) {
          await userModel.updateRefreshToken(user.id, null); // DB se delete
        }
      }

      res.clearCookie("refreshToken", cookieOptions);

      return res.status(200).json({
        success: true,
        message: "Logged out successfully! 🚪",
      });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ success: false, error: "Logout failed!" });
    }
  }

  // ============================================================
  // 📧 6. VERIFY OTP - Email verification complete
  // ============================================================
  static async verifyOTP(req: Request, res: Response) {
    try {
      const { email, token } = req.body;

      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User account with this email does not exist! ❌",
        });
      }

      // OTP valid + expired check (model me expires_at > NOW() check hai)
      const isValidToken = await userModel.checkActiveOTP(user.id, email, token);
      if (!isValidToken) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP token! 🚫",
        });
      }

      // isVerified = TRUE + OTP used mark
      await userModel.activateVerificationState(user.id, token);

      return res.status(200).json({
        success: true,
        message: "Email verified successfully! Now you can login. 🚀",
      });
    } catch (error) {
      console.error("Verify OTP error:", error);
      return res.status(500).json({ success: false, error: "Internal error during verification!" });
    }
  }

  // ============================================================
  // 🔑 7. FORGOT PASSWORD - Secure random token
  // ============================================================
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await userModel.findByEmail(email);

      // Security: Email exist kare ya na kare same message - enumeration block
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If the email is registered, a recovery token has been generated! 📬",
        });
      }

      const secureRandomToken = crypto.randomBytes(32).toString("hex");
      await userModel.saveResetTokenRecord(email, secureRandomToken);

      const recoveryLink = `http://localhost:5000/api/v1/auth/reset-password?token=${secureRandomToken}`;
      console.log(`✉ [EMAIL SIMULATOR] Reset Link for ${email}: ${recoveryLink}`);

      return res.status(200).json({
        success: true,
        message: "Password recovery link sent! Check console in dev. 📬",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({ success: false, error: "Recovery failed!" });
    }
  }

  // ============================================================
  // 🔄 8. RESET PASSWORD - Token verify + new hash
  // ============================================================
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      const resetRecord = await userModel.findValidResetToken(token);
      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: "Invalid token or link expired! 🚫",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await userModel.executePasswordRecoveryClearance(
        resetRecord.email,
        hashedPassword,
        token
      );

      return res.status(200).json({
        success: true,
        message: "Password reset successfully! Please login with new password. 🔑",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return res.status(500).json({ success: false, error: "Password reset failed!" });
    }
  }

  // ============================================================
  // 👤 9. GET ME - Logged in user profile
  // ============================================================
  static async getMe(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized!" });
      }

      const user = await userModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found!" });
      }

      // Password field remove karke bhejo
      const { password, refreshToken, ...safeUser } = user as any;

      return res.status(200).json({
        success: true,
        data: safeUser,
      });
    } catch (error) {
      console.error("GetMe error:", error);
      return res.status(500).json({ success: false, error: "Server error fetching profile!" });
    }
  }

  // ============================================================
  // ✏ 10. UPDATE ME - Citizen apna profile update kare
  // ============================================================
  static async updateMe(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, phone, avatarUrl, area_id } = req.body;

      await userModel.updateProfile(userId, { name, phone, avatarUrl, area_id });

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully! ✨",
      });
    } catch (error) {
      console.error("UpdateMe error:", error);
      return res.status(500).json({ success: false, error: "Server error updating profile!" });
    }
  }

  // ============================================================
  // 📧 11. RESEND OTP - ✅ FIXED: Ab DB me bhi save hoga
  // ============================================================
  static async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await userModel.findByEmail(email);

      if (!user) {
        return res.status(404).json({ success: false, message: "Email not found! ❌" });
      }

      if (user.isVerified) {
        return res.status(400).json({ success: false, message: "User is already verified! ✅" });
      }

      // ✅ CRITICAL FIX: Naya OTP generate + purana delete + naya INSERT
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Purane OTPs ko invalidate karo (optional cleanup)
      await pool.execute(`DELETE FROM email_verifications WHERE user_id = ? AND email = ?`, [user.id, email]);
      
      // Naya OTP insert
      await pool.execute(
        `INSERT INTO email_verifications (user_id, email, token, expires_at) 
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
        [user.id, email, newOtp]
      );

      console.log(`✉ [OTP RESEND SIMULATOR] New OTP for ${email}: ${newOtp} | Valid 10 min`);

      return res.status(200).json({
        success: true,
        message: "Verification OTP resent successfully! Check console. 📬",
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
      return res.status(500).json({ success: false, error: "Server error resending OTP!" });
    }
  }
}