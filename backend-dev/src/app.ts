import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
// @ts-expect-error cookie-parser typings are not installed in this project.
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import issueRoutes from "./routes/issueRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

const app: Application = express();

// ============================================================
// 🛡️ SECURITY MIDDLEWARES
// ============================================================

// ✅ Helmet — security headers (XSS, clickjacking, etc.)
app.use(helmet());

// ✅ CORS — strict allow-list
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:5173",
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ✅ Cookie parser — refresh token httpOnly cookie se read karne ke liye
app.use(cookieParser());

// ✅ Body parser
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ✅ NOTE: Rate limiters `src/middlewares/rateLimiter.ts` mein hain
// aur specific routes par apply hote hain (jaise userRoutes.ts mein authLimiter).
// Yahan global rate limiting ki zaroorat nahi — duplicate avoid karne ke liye.

// ============================================================
// 🛣️ API ROUTES MOUNTING — /api/v1 PREFIX
// ============================================================
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/issues", issueRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", statsRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ============================================================
// 📄 SWAGGER DOCS
// ============================================================
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// 🩺 ROOT HEALTH CHECK
// ============================================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CivicPulse API is running with MySQL! 🚀",
    version: "v1",
  });
});

// ============================================================
// ❌ 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================================
// ❌ CENTRALIZED ERROR HANDLER
// ============================================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Centralized Error:", err);
  
  if (err.name === "MulterError") {
    return res.status(400).json({ success: false, error: err.message });
  }
  
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, error: "Invalid or expired token." });
  }

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ success: false, error: "Duplicate entry." });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message;
  
  res.status(statusCode).json({ success: false, error: message });
});

export default app;