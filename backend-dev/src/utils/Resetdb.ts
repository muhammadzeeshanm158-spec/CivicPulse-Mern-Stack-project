import pool from '../config/db.js'

/**
 * ============================================================
 * 🧹 RESET DATABASE - Dummy Data Cleaner - FIXED IMPORT!
 * ============================================================
 * Kaam: Backend ka sara dummy data ek command me clear!
 * 
 * Fix: .js extension hataya hai taaki tsx double src/src error na de!
 * ============================================================
 */

async function resetDatabase() {
  let connection;
  try {
    console.log("🧹 Starting database reset... Dummy data clear ho raha hai...");

    connection = await pool.getConnection();

    // Foreign key checks band
    await connection.execute(`SET FOREIGN_KEY_CHECKS=0`);
    console.log("🔓 Foreign key checks disabled...");

    const tablesToClear = [
      "abuse_reports",
      "ratings",
      "comments",
      "issue_upvotes",
      "issue_follows",
      "notifications",
      "activity_logs",
      "issue_images",
      "password_resets",
      "email_verifications",
      "issues",
      "categories",
      "departments",
      "areas",
      "users",
    ];

    for (const table of tablesToClear) {
      try {
        const [rows]: any = await connection.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
          [table]
        );
        
        if (rows[0].count > 0) {
          await connection.execute(`TRUNCATE TABLE \`${table}\``);
          console.log(`✅ Cleared: ${table}`);
        } else {
          console.log(`⚠ Skipped (not found): ${table}`);
        }
      } catch (err: any) {
        console.log(`⚠ Could not clear ${table}: ${err.message}`);
      }
    }

    await connection.execute(`SET FOREIGN_KEY_CHECKS=1`);
    console.log("🔒 Foreign key checks enabled again!");

    console.log("\n🎉 Database reset completed! Sari dummy data clear! ✨");
    console.log("\n💡 Ab fresh data: npm run seed\n");

    connection.release();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during database reset:", error);
    if (connection) {
      try {
        await connection.execute(`SET FOREIGN_KEY_CHECKS=1`);
        connection.release();
      } catch {}
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("resetDb")) {
  resetDatabase();
}

export default resetDatabase;
