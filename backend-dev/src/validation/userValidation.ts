import { type Request, type Response, type NextFunction } from "express";

// ============================================================
// 👤 REGISTER VALIDATION
// ============================================================
// 🚨 CRITICAL FIX: Role validation REMOVE karo!
//
// PDF ke mutabiq citizen register par sirf "citizen" allow hai.
// Staff accounts sirf Admin bana sakta hai (/admin/create-staff endpoint se).
//
// Aapki current validation mein `role: "admin"` bhi accept ho raha hai,
// jo userController ke role escalation hole ko aur badhata hai.
export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body; // ← role hatao

  if (!name || name.trim() === "") {
    return res.status(400).json({ success: false, error: "name is required" });
  }

  // ✅ Better email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email address! Please check and try again." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: "The password must be at least 6 characters long! 🔒" });
  }

  // ✅ ADD: password strength (optional but recommended)
  // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
  //   return res.status(400).json({ success: false, error: "Password must contain uppercase, lowercase, and a number! 🔒" });
  // }

  // 🚨 REMOVE THIS BLOCK:
  // if (role) {
  //   const validRoles = ["citizen", "officer", "manager", "admin"];
  //   if (!validRoles.includes(role)) { ... }
  // }
  //
  // Citizen register par role accept nahi karna — controller mein hardcode "citizen".

  next();
};

// ============================================================
// 🔑 LOGIN VALIDATION
// ============================================================
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email address! Please check and try again." });
  }

  if (!password || password.trim() === "") {
    return res.status(400).json({ success: false, error: "Password is required! 🔒" });
  }

  next();
};

// ============================================================
// 🛠️ OTP VALIDATION
// ============================================================
export const validateOTPInput = (req: Request, res: Response, next: NextFunction) => {
  const { email, token } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "A valid email address is required! ✉️" });
  }

  if (!token || token.trim() === "") {
    return res.status(400).json({ success: false, error: "Verification OTP token code is required! 🔢" });
  }

  // ✅ ADD: OTP 6-digit check (agar 6-digit OTP use kar rahe hain)
  // if (!/^\d{6}$/.test(token)) {
  //   return res.status(400).json({ success: false, error: "OTP must be 6 digits! 🔢" });
  // }

  next();
};

// ============================================================
// 🔍 FORGOT PASSWORD VALIDATION
// ============================================================
export const validateForgotInput = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, error: "A valid registered email address is required! ✉️" });
  }
  next();
};

// ============================================================
// 🔒 RESET PASSWORD VALIDATION
// ============================================================
export const validateResetInput = (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  if (!token || token.trim() === "") {
    return res.status(400).json({ success: false, error: "Security reset verification token is missing! ❌" });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "The new password must be at least 6 characters long! 🔒" });
  }
  next();
};


// ============================================================
// 📛 ALIAS EXPORTS — userRoutes.ts ke naam se match karne ke liye
// ============================================================
// userRoutes.ts mein `validateOTP` aur `validateResetPassword` import ho rahe hain,
// lekin yahan `validateOTPInput` aur `validateResetInput` hain.
// Dono naam kaam karne chahiye — alias export kar rahe hain.
export const validateOTP = validateOTPInput;
export const validateResetPassword = validateResetInput;
