-- ============================================================
-- HOD ROLE SYSTEM MIGRATION
-- ============================================================

-- 1. Add columns to users table for HOD reporting structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type ENUM('student', 'faculty', 'hod', 'admin') DEFAULT 'student' AFTER id;
ALTER TABLE users ADD COLUMN IF NOT EXISTS report_to INT NULL AFTER user_type;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL AFTER report_to;
ALTER TABLE users ADD FOREIGN KEY IF NOT EXISTS (report_to) REFERENCES users(id) ON DELETE SET NULL;

-- 2. Update courses table to track HOD ownership
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hod_id INT NULL AFTER created_by;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL AFTER hod_id;
ALTER TABLE courses ADD FOREIGN KEY IF NOT EXISTS (hod_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Track who assigned faculty to courses
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS assigned_by INT NULL AFTER status;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER assigned_by;
ALTER TABLE course_enrollments ADD FOREIGN KEY IF NOT EXISTS (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Create HOD audit log table
CREATE TABLE IF NOT EXISTS hod_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hod_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_hod_id (hod_id),
  INDEX idx_created_at (created_at)
);

-- 5. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_report_to ON users(report_to);
CREATE INDEX IF NOT EXISTS idx_hod_id ON courses(hod_id);
CREATE INDEX IF NOT EXISTS idx_user_type ON users(user_type);

-- 6. Sample data for testing (optional)
-- Uncomment to add test data:
/*
-- Create admin user
INSERT INTO users (name, email, user_type, password, created_at) 
VALUES ('Admin User', 'admin@test.com', 'admin', 'hashed_password', NOW());

-- Create HOD1
INSERT INTO users (name, email, user_type, department, password, created_at) 
VALUES ('HOD1', 'hod1@test.com', 'hod', 'Computer Science', 'hashed_password', NOW());

-- Create HOD2
INSERT INTO users (name, email, user_type, department, password, created_at) 
VALUES ('HOD2', 'hod2@test.com', 'hod', 'Electronics', 'hashed_password', NOW());

-- Create Faculty 1 (reports to HOD1)
INSERT INTO users (name, email, user_type, department, report_to, password, created_at) 
VALUES ('Faculty1', 'fac1@test.com', 'faculty', 'Computer Science', 1, 'hashed_password', NOW());

-- Create Faculty 2 (reports to HOD1)
INSERT INTO users (name, email, user_type, department, report_to, password, created_at) 
VALUES ('Faculty2', 'fac2@test.com', 'faculty', 'Computer Science', 1, 'hashed_password', NOW());

-- Create Faculty 3 (reports to HOD2)
INSERT INTO users (name, email, user_type, department, report_to, password, created_at) 
VALUES ('Faculty3', 'fac3@test.com', 'faculty', 'Electronics', 2, 'hashed_password', NOW());
*/
