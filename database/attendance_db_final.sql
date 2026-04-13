-- ══════════════════════════════════════════════════════════════════════════════
-- ATTENDANCE TRACKING SYSTEM - COMPLETE DATABASE SCHEMA
-- Based on Task App structure with role-based access (Admin, Faculty, Student)
-- ══════════════════════════════════════════════════════════════════════════════

DROP DATABASE IF EXISTS attendance_db;
CREATE DATABASE attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_db;

-- ──────────────────────────────────────────────────────────────────────────────
-- USERS TABLE (Admin, Faculty, Student roles)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type ENUM('student', 'faculty', 'admin') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) DEFAULT 1,
  push_token VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_type (user_type),
  INDEX idx_email (email),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- COURSES TABLE (Admin creates, assigns to Faculty)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE courses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_code VARCHAR(50) NOT NULL UNIQUE,
  max_students INT DEFAULT 50,
  assigned_faculty_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule_days VARCHAR(100),
  time_slot_start TIME,
  time_slot_end TIME,
  assignment_status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  accepted_at TIMESTAMP NULL,
  rejected_at TIMESTAMP NULL,
  status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_faculty_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_faculty (assigned_faculty_id),
  INDEX idx_code (course_code),
  INDEX idx_assignment_status (assignment_status),
  INDEX idx_start_date (start_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- COURSE SESSIONS (Auto-generated from course schedule)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE course_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course (course_id),
  INDEX idx_date (session_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- COURSE ENROLLMENTS (Admin/Faculty adds Students)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE course_enrollments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  enrolled_by BIGINT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (course_id, student_id),
  INDEX idx_course (course_id),
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- SESSION ATTENDANCE (OTP-based marking)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE session_attendance (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  start_marked_at DATETIME,
  end_marked_at DATETIME,
  status ENUM('present', 'absent', 'late', 'left_early', 'on_leave') DEFAULT 'absent',
  duration_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES course_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (session_id, student_id),
  INDEX idx_session (session_id),
  INDEX idx_student (student_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- LEAVE REQUESTS (Students request, Faculty approves)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE leave_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  course_id BIGINT,
  leave_type ENUM('CASUAL', 'MEDICAL', 'ON_DUTY', 'COMP_OFF') DEFAULT 'CASUAL',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  is_half_day TINYINT(1) DEFAULT 0,
  half_day_type ENUM('MORNING', 'AFTERNOON'),
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  approved_by BIGINT,
  approved_at DATETIME,
  rejected_at DATETIME,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_student (student_id),
  INDEX idx_status (status),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS (Course assignments, Leave approvals)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  course_id BIGINT,
  reference_data JSON,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_type (type),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- INFRASTRUCTURE (Classrooms, Labs - Task App pattern)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE infrastructure (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subtype VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- SYSTEM SETTINGS (OTP validity, working hours, etc.)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE system_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value LONGTEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────────────────────
-- AUDIT LOGS (Track Admin/Faculty actions)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id BIGINT,
  entity_name VARCHAR(255),
  old_value LONGTEXT,
  new_value LONGTEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_actor_id (actor_id),
  INDEX idx_entity_type (entity_type),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_entity_id (entity_id),
  CONSTRAINT fk_actor_id FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════════════════════
-- INITIAL DATA
-- ══════════════════════════════════════════════════════════════════════════════

-- Sample Users (password: 'password123')
INSERT INTO users (name, email, password, user_type) VALUES
('Admin User', 'admin@college.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'admin'),
('Dr. Rajesh Kumar', 'rajesh@college.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'faculty'),
('Dr. Priya Sharma', 'priya@college.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'faculty'),
('Rahul Verma', 'rahul@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student'),
('Sneha Patel', 'sneha@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student'),
('Arjun Singh', 'arjun@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student'),
('Ananya Desai', 'ananya@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student');

-- System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('otp_validity', '10', 'OTP validity in seconds (10-second expiry)'),
('working_hours_start', '09:00', 'Working hours start time (HH:MM format)'),
('working_hours_end', '17:00', 'Working hours end time (HH:MM format)'),
('working_hours_enabled', 'true', 'Whether working hours validation is enabled'),
('admin_panel_view_user_ids', '[1]', 'JSON array of user IDs with admin panel access'),
('max_leave_percentage', '25', 'Maximum allowed leave percentage'),
('attendance_threshold', '75', 'Minimum attendance percentage required');

-- Infrastructure Examples
INSERT INTO infrastructure (name, subtype, capacity, location) VALUES
('Lab 301', 'Computer Lab', 60, 'Block A, 3rd Floor'),
('Lab 205', 'Computer Lab', 50, 'Block B, 2nd Floor'),
('Room 401', 'Classroom', 70, 'Block A, 4th Floor'),
('Auditorium', 'Hall', 200, 'Main Building');

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY TABLES
-- ══════════════════════════════════════════════════════════════════════════════
SELECT 'Database setup complete!' AS status;
SHOW TABLES;