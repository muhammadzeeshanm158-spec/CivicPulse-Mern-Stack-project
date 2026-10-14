import dotenv from "dotenv";
dotenv.config({ override: false }); // ✅ Override false - warning khatam

process.env.NODE_ENV = "test";

// Jest ke baad DB close karna
import pool from "../config/db.js";

afterAll(async () => {
  try {
    await pool.end();
    console.log("✅ DB pool closed - Jest exit");
  } catch {}
});