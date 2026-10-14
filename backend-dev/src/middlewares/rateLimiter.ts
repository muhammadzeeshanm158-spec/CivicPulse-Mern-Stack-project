import rateLimit from "express-rate-limit";

// ============================================================
// 🔐 AUTH LIMITER — Login, Register, Forgot Password
// ============================================================
// 5 attempts per 15 min. Brute force attacks rokne ke liye.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Too many attempts! Please try again after 15 minutes. 🚫",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// 📝 ISSUE REPORT LIMITER — 20 reports per day
// ============================================================
// ⚠️ NOTE: keyGenerator hata diya — express-rate-limit v7 default IP use karta hai
// (jo IPv6-safe hai). Custom keyGenerator ke liye ipKeyGenerator chahiye.
export const issueReportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: "Daily report limit reached! Try again tomorrow. 🚫",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// 🌐 GENERAL API LIMITER
// ============================================================
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests! Please slow down. 🚫",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// 📧 OTP LIMITER
// ============================================================
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: "Too many OTP requests! Please try again later. 🚫",
  },
  standardHeaders: true,
  legacyHeaders: false,
});