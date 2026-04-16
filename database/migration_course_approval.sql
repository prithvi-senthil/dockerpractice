-- ============================================================
-- COURSE APPROVAL SYSTEM MIGRATION
-- ============================================================
-- This migration adds course approval workflow columns
-- allowing Admin to approve/reject courses created by HODs
-- ============================================================

-- ============================================================
-- ALTER USERS TABLE - Add HOD role and hierarchy columns
-- ============================================================
-- Step 1: Modify user_type enum to include 'hod'
ALTER TABLE users MODIFY user_type ENUM('admin', 'hod', 'faculty', 'student') DEFAULT 'student';

-- Step 2: Add report_to and department columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS report_to INT COMMENT 'HOD ID or Manager ID for hierarchy' AFTER user_type,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) COMMENT 'Department name' AFTER report_to;

-- Step 3: Add foreign key for report_to (self-join for hierarchy)
-- Drop constraint if exists first to avoid duplicates
ALTER TABLE users DROP FOREIGN KEY IF EXISTS fk_users_report_to;
ALTER TABLE users 
ADD CONSTRAINT fk_users_report_to FOREIGN KEY (report_to) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- ALTER courses table to add approval workflow columns
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING' AFTER created_by,
ADD COLUMN IF NOT EXISTS approved_by INT AFTER approval_status,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS rejected_by INT AFTER approved_at,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL AFTER rejected_by,
ADD COLUMN IF NOT EXISTS approval_notes TEXT AFTER rejected_at,
ADD COLUMN IF NOT EXISTS hod_id INT AFTER code,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) AFTER hod_id;

-- Add foreign key for hod_id
ALTER TABLE courses 
ADD CONSTRAINT fk_courses_hod FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key for approved_by (admin user)
ALTER TABLE courses 
ADD CONSTRAINT fk_courses_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add foreign key for rejected_by (admin user)
ALTER TABLE courses 
ADD CONSTRAINT fk_courses_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for approval status queries (Admin dashboard)
CREATE INDEX idx_courses_approval_status ON courses(approval_status);

-- Create index for HOD courses (department isolation)
CREATE INDEX idx_courses_hod_id ON courses(hod_id);

-- Create index for approved courses (fast filtering for students)
CREATE INDEX idx_courses_approved ON courses(approval_status) WHERE approval_status = 'APPROVED';

-- ============================================================
-- AUDIT LOGS TABLE (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, APPROVE, REJECT, MARK_START, MARK_END
  entity_type VARCHAR(50) NOT NULL, -- COURSE, LEAVE_REQUEST, ATTENDANCE, STUDENT, FACULTY
  entity_id INT NOT NULL,
  trace_name VARCHAR(100),
  old_values JSON,
  new_values JSON,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type),
  INDEX idx_audit_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- UPDATE EXISTING COURSES TO AUTO-SET hod_id (IF NULL)
-- ============================================================
-- This assumes courses have created_by field pointing to user
-- For courses that were created by HODs, set hod_id = created_by
-- For courses created by admin, leave hod_id = NULL

UPDATE courses c
SET hod_id = c.created_by, approval_status = 'APPROVED'
WHERE hod_id IS NULL 
  AND created_by IN (SELECT id FROM users WHERE user_type = 'hod');

-- For admin-created courses, auto-approve
UPDATE courses c
SET approval_status = 'APPROVED',
    approved_by = c.created_by,
    approved_at = c.created_at
WHERE approval_status = 'PENDING' 
  AND created_by IN (SELECT id FROM users WHERE user_type = 'admin');

-- ============================================================
-- STUDENT-SPECIFIC TABLES (if not exist)
-- ============================================================
-- ensure attendance_records has proper columns
ALTER TABLE IF EXISTS attendance_records 
ADD COLUMN IF NOT EXISTS status ENUM('present', 'absent', 'on_leave') DEFAULT 'present' AFTER duration_minutes;

-- ensure leave_requests has student_id aliasing
ALTER TABLE IF EXISTS leave_requests 
ADD COLUMN IF NOT EXISTS user_id INT COMMENT 'Alias for student_id for faculty/student leaves' AFTER id;

-- Copy data from student_id to user_id if empty
UPDATE leave_requests 
SET user_id = student_id 
WHERE user_id IS NULL;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify migration success:

-- Check users table has required columns
SELECT id, email, user_type, report_to, department FROM users LIMIT 5;

-- Check courses with approval workflow
SELECT id, title, hod_id, approval_status, approved_by, approved_at FROM courses LIMIT 5;

-- Check audit logs structure
DESCRIBE audit_logs;

-- Check department isolation (should see 0 cross-department access)
SELECT c.id, c.title, u.name as hod_name 
FROM courses c 
JOIN users u ON c.hod_id = u.id 
WHERE c.approval_status = 'PENDING';
