import { Router } from "express";
import { userController } from "../controllers/userController.js";
import {
  validateRegister,
  validateLogin,
  validateOTP,          // ← Alias (jo userValidation.ts mein hai)
  validateResetPassword, // ← Alias (jo userValidation.ts mein hai)
} from "../validation/userValidation.js";
import { authorizeRoles, verifyToken } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// ============================================================
// 📝 PUBLIC REGISTRATION
// ============================================================
router.post(
  "/register",
  authLimiter,
  validateRegister,
  userController.register
);

// ============================================================
// 📧 OTP VERIFICATION
// ============================================================
router.post(
  "/verify-otp",
  validateOTP,
  userController.verifyOTP
);

// ============================================================
// 🔑 LOGIN
// ============================================================
router.post("/login", authLimiter, validateLogin, userController.login);

// ============================================================
// 👤 USER PROFILE (Protected Routes)
// ============================================================
// Get current logged-in user profile
router.get(
  "/me",
  verifyToken,
  userController.getMe
);

// Update current logged-in user profile
// ============================================================
// 👤 PROFILE ROUTES
// ============================================================
router.get("/me", verifyToken, userController.getMe);

// ============================================================
// 👥 ADMIN: STAFF CREATION
// ============================================================
router.post(
  "/admin/create-staff",
  verifyToken,
  authorizeRoles("admin"),
  userController.createStaff
);

// ============================================================
// 🔄 REFRESH TOKEN ROTATION
// ============================================================
router.post("/refresh", userController.refresh);

// ============================================================
// 🚪 LOGOUT
// ============================================================
router.post("/logout", userController.logout);

// ============================================================
// 🔑 FORGOT PASSWORD
// ============================================================
router.post(
  "/forgot-password",
  authLimiter,
  userController.forgotPassword
);

// ============================================================
// 🔄 RESET PASSWORD
// ============================================================
router.post(
  "/reset-password",
  validateResetPassword,
  userController.resetPassword
);

export default router;