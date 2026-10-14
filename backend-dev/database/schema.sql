-- ============================================================
-- 🗄️ CIVICPULSE — COMPLETE BUG-FREE DATABASE SCHEMA
-- ============================================================

DROP DATABASE IF EXISTS civicpulse;

CREATE DATABASE civicpulse 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE civicpulse;

-- ============================================================
-- 👥 1. USERS TABLE
-- ============================================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('citizen', 'officer', 'manager', 'admin') DEFAULT 'citizen',
  department_id INT DEFAULT NULL,
  area_id INT DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  avatarUrl VARCHAR(500) DEFAULT NULL,
  isVerified BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  refreshToken VARCHAR(500) DEFAULT NULL,
  tokenExpiresAt DATETIME DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_active (isActive)
);

-- ============================================================
-- 🏢 2. DEPARTMENTS TABLE
-- ============================================================
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  manager_id INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_departments_manager (manager_id)
);

-- ============================================================
-- 🏷️️ 3. CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  defaultSlaHours INT DEFAULT 48,
  severityLevel INT DEFAULT 1,
  icon VARCHAR(100) DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  INDEX idx_categories_department (department_id),
  CONSTRAINT chk_severity CHECK (severityLevel BETWEEN 1 AND 5)
);

-- ============================================================
-- 📍 4. AREAS TABLE (SPATIAL)
-- ============================================================
CREATE TABLE areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  boundaryCoords POLYGON DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  SPATIAL INDEX idx_areas_boundary (boundaryCoords),
  INDEX idx_areas_city (city)
);

-- ============================================================
-- 🚨 5. ISSUES TABLE (FIXED: reporter_id replaced with user_id)
-- ============================================================
CREATE TABLE issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticketNo VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id INT DEFAULT NULL,
  area_id INT DEFAULT NULL,
  location VARCHAR(500) NOT NULL,
  location_point POINT DEFAULT NULL,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  image TEXT DEFAULT NULL,
  status ENUM(
    'Submitted','Verified','Rejected','Duplicate',
    'Assigned','InProgress','Resolved','Closed','Reopened'
  ) DEFAULT 'Submitted',
  priorityScore INT DEFAULT 0,
  user_id INT NOT NULL, -- ✅ Fixed: matches code & other tables
  isAnonymous BOOLEAN DEFAULT FALSE,
  assigned_to INT DEFAULT NULL,
  deadline DATETIME DEFAULT NULL,
  slaBreached BOOLEAN DEFAULT FALSE,
  upvoteCount INT DEFAULT 0,
  resolution_note TEXT DEFAULT NULL,
  resolution_images TEXT DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  resolution_rating INT DEFAULT NULL,
  resolution_feedback TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  
  SPATIAL INDEX idx_issues_location (location_point),
  FULLTEXT INDEX idx_issues_search (title, description),
  INDEX idx_issues_status_area_date (status, area_id, createdAt),
  INDEX idx_issues_category (category_id),
  INDEX idx_issues_assigned (assigned_to),
  INDEX idx_issues_sla (slaBreached),
  INDEX idx_issues_user (user_id)
);

-- ============================================================
-- 📝 6. ISSUE EVENTS (AUDIT TIMELINE)
-- ============================================================
CREATE TABLE issueEvents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  actor_id INT NOT NULL,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  note TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_events_issue_date (issue_id, createdAt)
);

-- ============================================================
-- 👍 7. UPVOTES TABLE
-- ============================================================
CREATE TABLE upvotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_issue_vote (issue_id, user_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_upvotes_user (user_id)
);

-- ============================================================
-- 🔔 8. ISSUE FOLLOWERS
-- ============================================================
CREATE TABLE issue_followers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_follow (issue_id, user_id),
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_followers_user (user_id)
);

-- ============================================================
-- 💬 9. ISSUE COMMENTS (THREADED)
-- ============================================================
CREATE TABLE issueComments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  issue_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_id INT DEFAULT NULL,
  comment TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  isHidden BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES issueComments(id) ON DELETE CASCADE,
  
  INDEX idx_comments_issue_date (issue_id, createdAt),
  INDEX idx_comments_parent (parent_id)
);

-- ============================================================
-- 🔔 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  issue_id INT DEFAULT NULL,
  message TEXT NOT NULL,
  readAt TIMESTAMP NULL DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  
  INDEX idx_notifications_user_read (user_id, readAt),
  INDEX idx_notifications_user_date (user_id, createdAt)
);

-- ============================================================
-- 📧 11. EMAIL VERIFICATIONS
-- ============================================================
CREATE TABLE email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_verif_token (token),
  INDEX idx_verif_user (user_id)
);

-- ============================================================
-- 🔑 12. PASSWORD RESETS
-- ============================================================
CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_reset_token (token),
  INDEX idx_reset_email (email)
);

-- ============================================================
-- 🚩 13. ABUSE REPORTS
-- ============================================================
CREATE TABLE abuse_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  item_type ENUM('comment', 'issue', 'user') NOT NULL,
  reported_item_id INT NOT NULL,
  reason ENUM('Spam', 'Harassment', 'Nudity', 'Fake Profile', 'Inappropriate') NOT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('pending', 'dismissed', 'content_removed', 'user_banned') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP NULL DEFAULT NULL,
  
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_abuse_status_type (status, item_type),
  INDEX idx_abuse_item (item_type, reported_item_id)
);

-- ============================================================
-- 📝 14. ADMIN ACTIVITY LOGS
-- ============================================================
CREATE TABLE admin_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_id INT DEFAULT NULL,
  ip_address VARCHAR(45) NOT NULL,
  details TEXT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_logs_filter (admin_id, action, createdAt)
);

-- ============================================================
-- ✅ VERIFICATION QUERIES
-- ============================================================
SHOW TABLES;
DESCRIBE issues;