import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 📁 .env file se saare environment variables ko process.env mein load kar rahe hain

// Pehle check karo env already loaded hai ya nahi
// ✅ Sirf tab load karo jab pehle se loaded nahi hai
if (!process.env.JWT_SECRET) {
  dotenv.config({ quiet: true }); // quiet: true se console.error band
}

// 🔍 Ek helper function jo check karega ke koi zaroori environment variable missing to nahi hai
const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  // Agar variable undefined hai ya khali string hai to error throw karega aur server yahin ruk jayega
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

// 🗄️ MySQL Connection Pool create kar rahe hain jo connections ko efficiently reuse karega
const pool = mysql.createPool({
  host: getRequiredEnv('DB_HOST'),         // Database hosting address (e.g. localhost)
  user: getRequiredEnv('DB_USER'),         // Database username (e.g. root)
  password: getRequiredEnv('DB_PASSWORD'), // Database user password
  database: getRequiredEnv('DB_NAME'),     // Main database ka naam
  waitForConnections: true,                // Agar saare connections busy hon to naye request ko queue mein wait karwaye
  connectionLimit: 10,                     // Maximum ek waqt mein 10 open connections allow honge
  queueLimit: 0,                           // Queue mein requests ki koi limit nahi hai (unlimited)
});

// 📤 Models aur baki files mein database queries run karne ke liye pool ko default export kar rahe hain

// connectDb function ke saath pool bhi export karo
export const connectDb = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query("SELECT 1"); // ✅ DB verify
    console.log("MySQL Database Connected Successfully! 🗄️");
    connection.release();
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

// ✅ Graceful shutdown ke liye
export const closeDb = async () => {
  try {
    await pool.end();
    console.log("✅ Database pool closed.");
  } catch (error) {
    console.error("❌ Error closing DB pool:", error);
  }
};

export default pool;
