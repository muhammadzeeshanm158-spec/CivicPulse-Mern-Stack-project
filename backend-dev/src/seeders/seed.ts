import pool from "../config/db.js";
import bcrypt from "bcrypt";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Clean old data (optional - development ke liye)
    // await pool.execute(`SET FOREIGN_KEY_CHECKS=0`);
    // await pool.execute(`TRUNCATE TABLE issues`);
    // await pool.execute(`TRUNCATE TABLE users`);
    // await pool.execute(`TRUNCATE TABLE categories`);
    // await pool.execute(`TRUNCATE TABLE departments`);
    // await pool.execute(`TRUNCATE TABLE areas`);
    // await pool.execute(`SET FOREIGN_KEY_CHECKS=1`);

    // ============================================================
    // 1. AREAS - Polygon ke sath (Spatial query ke liye)
    // ============================================================
    console.log("📍 Seeding areas with spatial polygons...");
    // Karachi ke 4 sample areas - ST_GeomFromText se polygon
    await pool.execute(`
      INSERT IGNORE INTO areas (id, name, city, boundaryCoords) VALUES 
      (1, 'Downtown North', 'Karachi', ST_GeomFromText('POLYGON((67.0 24.8, 67.1 24.8, 67.1 24.9, 67.0 24.9, 67.0 24.8))', 4326)),
      (2, 'Suburban West', 'Karachi', ST_GeomFromText('POLYGON((67.1 24.8, 67.2 24.8, 67.2 24.9, 67.1 24.9, 67.1 24.8))', 4326)),
      (3, 'Industrial Zone', 'Karachi', ST_GeomFromText('POLYGON((67.0 24.9, 67.1 24.9, 67.1 25.0, 67.0 25.0, 67.0 24.9))', 4326)),
      (4, 'Commercial District', 'Karachi', ST_GeomFromText('POLYGON((67.1 24.9, 67.2 24.9, 67.2 25.0, 67.1 25.0, 67.1 24.9))', 4326))
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `);

    // ============================================================
    // 2. DEPARTMENTS - Manager ID ke sath
    // ============================================================
    console.log("🏢 Seeding departments with manager_id...");
    await pool.execute(`
      INSERT IGNORE INTO departments (id, name, description, manager_id) VALUES 
      (1, 'Sanitation', 'Waste management and street cleaning', 4),
      (2, 'Roads & Infrastructure', 'Potholes and street repairs', 4),
      (3, 'Water & Sewage', 'Water leaks and drainage', 4),
      (4, 'Electricity & Power', 'Streetlight and electrical hazards', 4)
      ON DUPLICATE KEY UPDATE manager_id=VALUES(manager_id);
    `);

    // ============================================================
    // 3. CATEGORIES - ✅ FIX: severityLevel INT hai (1-5)
    // ============================================================
    console.log("🏷 Seeding categories with INT severity...");
    await pool.execute(`
      INSERT IGNORE INTO categories (id, name, department_id, severityLevel, defaultSlaHours) VALUES 
      (1, 'Garbage Dump Overflow', 1, 3, 24),
      (2, 'Pothole on Main Road', 2, 4, 48),
      (3, 'Water Pipeline Leak', 3, 5, 12),
      (4, 'Streetlight Outage', 4, 2, 72),
      (5, 'Blocked Drainage', 3, 3, 24)
      ON DUPLICATE KEY UPDATE severityLevel=VALUES(severityLevel);
    `);

    // ============================================================
    // 4. USERS - ✅ FIX: isVerified=TRUE + department + area
    // ============================================================
    console.log("👥 Seeding default users with isVerified=TRUE...");
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Pehle manager banao taake department manager_id set ho sake
    await pool.execute(
      `
      INSERT IGNORE INTO users (id, name, email, password, role, isVerified, isActive, department_id, area_id) VALUES 
      (1, 'System Admin', 'admin@civicpulse.com', ?, 'admin', TRUE, TRUE, NULL, NULL),
      (4, 'Manager Ali', 'manager@civicpulse.com', ?, 'manager', TRUE, TRUE, 2, 1),
      (2, 'Field Officer John', 'officer@civicpulse.com', ?, 'officer', TRUE, TRUE, 2, 1),
      (3, 'Citizen Alice', 'citizen@civicpulse.com', ?, 'citizen', TRUE, TRUE, NULL, 1)
      ON DUPLICATE KEY UPDATE isVerified=TRUE, isActive=TRUE;
    `,
      [hashedPassword, hashedPassword, hashedPassword, hashedPassword],
    );

    // Departments ka manager_id update (ab user 4 exist karta hai)
    await pool.execute(
      `UPDATE departments SET manager_id = 4 WHERE id IN (1,2,3,4)`,
    );

    // ============================================================
    // 5. SAMPLE ISSUES - ✅ FIX: Saare required fields
    // ============================================================
    console.log("📋 Seeding sample issues with location data...");
    await pool.execute(`
      INSERT IGNORE INTO issues 
      (id, ticketNo, title, description, category_id, area_id, reporter_id, assigned_to, status, priorityScore, location, latitude, longitude, location_point, deadline, upvoteCount, slaBreached) 
      VALUES 
      (1, 'CP-2026-0001', 'Large pothole near central square', 'A dangerous pothole causing traffic slowdown.', 2, 1, 3, 2, 'InProgress', 85.5, 'Main Road, Downtown North, Karachi', 24.85, 67.05, ST_GeomFromText('POINT(67.05 24.85)', 4326), DATE_ADD(NOW(), INTERVAL 2 DAY), 5, FALSE),
      (2, 'CP-2026-0002', 'Overflowing garbage bin', 'Garbage not picked up for 3 days near market.', 1, 2, 3, 2, 'Submitted', 45.0, 'Market Corner, Suburban West, Karachi', 24.86, 67.15, ST_GeomFromText('POINT(67.15 24.86)', 4326), DATE_ADD(NOW(), INTERVAL 1 DAY), 2, FALSE),
      (3, 'CP-2026-0003', 'Broken streetlight', 'Streetlight flickering and dead, security risk.', 4, 1, 3, NULL, 'Submitted', 30.0, 'Street 5, Downtown North, Karachi', 24.84, 67.04, ST_GeomFromText('POINT(67.04 24.84)', 4326), DATE_ADD(NOW(), INTERVAL 3 DAY), 1, FALSE)
      ON DUPLICATE KEY UPDATE title=VALUES(title);
    `);

    console.log("\n✅ Database seeding completed successfully! 🎉");
    console.log("\n📋 Default Logins:");
    console.log("   Admin    -> admin@civicpulse.com / Password123!");
    console.log("   Manager  -> manager@civicpulse.com / Password123!");
    console.log("   Officer  -> officer@civicpulse.com / Password123!");
    console.log("   Citizen  -> citizen@civicpulse.com / Password123!");
    console.log(
      "\n💡 Note: All users are verified (isVerified=TRUE) and active.\n",
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
    process.exit(1);
  }
}

seedDatabase();

