-- ============================================================
-- Add HOD Support to Users Table
-- ============================================================

USE attendance_db;

-- Step 1: Modify user_type enum to include 'hod'
ALTER TABLE users MODIFY user_type ENUM('admin', 'hod', 'faculty', 'student') DEFAULT 'student';

-- Step 2: Add report_to column (HOD/Manager ID)
ALTER TABLE users ADD COLUMN report_to INT NULL COMMENT 'HOD ID for faculty, Manager ID for hierarchy';

-- Step 3: Add department column
ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL COMMENT 'Department name';

-- Step 4: Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_report_to FOREIGN KEY (report_to) REFERENCES users(id) ON DELETE SET NULL;

-- Verify the changes
DESC users;
SELECT id, name, email, user_type, report_to, department FROM users LIMIT 5;

-- ============================================================
-- COURSES TABLE - Add approval workflow
-- ============================================================
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING' AFTER created_by,
ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER approval_status,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN IF NOT EXISTS hod_id INT NULL COMMENT 'HOD who created the course' AFTER code;

-- Add foreign keys for courses
ALTER TABLE courses ADD CONSTRAINT fk_courses_hod FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE courses ADD CONSTRAINT fk_courses_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_approval_status ON courses(approval_status);
CREATE INDEX IF NOT EXISTS idx_courses_hod_id ON courses(hod_id);

-- Verify courses table
DESC courses;
