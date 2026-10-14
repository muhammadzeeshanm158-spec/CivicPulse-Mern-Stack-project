import dotenv from "dotenv";
dotenv.config(); // ✅ FIX: ENV validation se PEHLE load karna lazmi hai

import app from "./app.js";
import http from "http";
import pool from "./config/db.js"; // ✅ FIX: Tum db.ts me `pool` export kar rahe ho, `connectDb` nahi
import { initSLAScheduler, stopSLAScheduler } from "./schedulers/slaScheduler.js"; // ✅ FIX: Actual file is under `config/schedulers/`
import { initSocket } from "./config/socket.js";

// ============================================================
// ✅ ENV VALIDATION (PDF requirement)
// ============================================================
const requiredEnvVars = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "DB_HOST",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];
const missingVars = requiredEnvVars.filter(v =>!process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ Missing required env vars:", missingVars.join(", "));
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ⚡ Socket.IO init - HTTP server ke sath attach
initSocket(server);

// ============================================================
// 🚀 START SERVER
// ============================================================
const startServer = async () => {
  try {
    // DB connection verify - pool se
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully! 🗄");

    // SLA scheduler start - 15 min interval
    initSLAScheduler();

    // Server listen
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
      console.log(`⚡ Socket.IO ready for real-time updates`);
    });
  } catch (error) {
    console.error("❌ Server start error:", error instanceof Error? error.message : error);
    process.exit(1);
  }
};

// ============================================================
// 🛑 GRACEFUL SHUTDOWN (PDF: Production Readiness)
// ============================================================
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠ ${signal} received. Closing server gracefully...`);

  // ✅ FIX: Pehle scheduler stop karo taake duplicate cron na chale
  stopSLAScheduler();

  server.close(async () => {
    console.log("✅ HTTP server closed.");
    try {
      await pool.end(); // MySQL pool close
      console.log("✅ DB pool closed.");
    } catch (err) {
      console.error("DB close error:", err);
    }
    process.exit(0);
  });

  // Force exit after 10s if graceful fails
  setTimeout(() => {
    console.error("⚠ Forced exit after 10s timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

startServer();