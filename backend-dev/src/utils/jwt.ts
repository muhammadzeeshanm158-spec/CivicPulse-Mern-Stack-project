import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";

// ============================================================
// 🔐 SECRETS — SIRF .env SE
// ============================================================
// 🚨 CRITICAL FIX: Hardcoded fallback hatao.
// Agar env var set nahi hai to server start hona hi nahi chahiye.
// PDF: "secrets committed to repo" = AUTOMATIC FAIL condition.
const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    "❌ JWT_SECRET and JWT_REFRESH_SECRET must be set in .env! Server cannot start."
  );
}

// ============================================================
// 🎫 ACCESS TOKEN — 15 min validity
// ============================================================
// Short-lived token for API authorization.
// Payload: { id, email, role }
export const generateAccessToken = (userId: number, email: string, role: string) => {
  return jwt.sign(
    { id: userId, email, role },
    ACCESS_SECRET,
    { expiresIn: "15m" }
  );
};

// ============================================================
// 🔄 REFRESH TOKEN — 7 days validity
// ============================================================
// Long-lived token for session refresh.
// NOTE: Best practice — token ko hash karke DB mein save karo.
// ⚠️ MISSING: `jti` (JWT ID) — revocation/blacklist ke liye zaroori.
export const generateRefreshToken = (userId: number, email: string, role: string) => {
  return jwt.sign(
    { id: userId, email, role },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

// ============================================================
// 🛡️ VERIFY HELPERS
// ============================================================
// Access token verify karta hai. `authMiddleware` bhi isi ko use kare
// (duplicate secret avoid karne ke liye).
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload & {
    id: number;
    email: string;
    role: string;
  };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET) as jwt.JwtPayload & {
    id: number;
    email: string;
    role: string;
  };
};

// ============================================================
// 🍪 COOKIE OPTIONS — httpOnly + secure + sameSite
// ============================================================
// ✅ httpOnly: JS access nahi kar sakti (XSS protection)
// ✅ secure: production mein HTTPS only
// ✅ sameSite: 'strict' — CSRF protection
// ✅ maxAge: 7 days (refresh token ki validity ke barabar)
//
// ⚠️ NOTE: Refresh token ko **alag cookie** mein rakhna better hota hai:
//   - `refreshToken` cookie → path: /api/auth/refresh
//   - access token → memory/localStorage mein (short-lived)
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ============================================================
// ❌ MISSING (PDF requirement ke against)
// ============================================================
// ❌ Access token blacklist — logout ke baad 15 min tak valid rehta hai.
//    Redis mein revoke karo.
//
// ❌ Token family tracking — refresh-token reuse detection ke liye.
//    Agar purana rotated token use ho to entire family revoke karo.
//
// ❌ `jti` claim — unique token ID add karo revocation ke liye.