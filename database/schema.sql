-- Attendance Tracking System Database Schema

-- Drop existing tables if they exist
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS session_attendance;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS course_sessions;
DROP TABLE IF EXISTS activity_enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type ENUM('student', 'faculty', 'admin') NOT NULL DEFAULT 'student',
  is_active TINYINT(1) DEFAULT 1,
  push_token VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Courses table (courses created by admin and assigned to faculty)
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
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Course sessions table (individual sessions for a course)
CREATE TABLE course_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id BIGINT NOT NULL,
  session_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course (course_id),
  INDEX idx_date (session_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Course enrollments (students enrolled in courses)
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

-- Activities table (like classes/labs)
CREATE TABLE activities (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id BIGINT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  location VARCHAR(255),
  max_students INT DEFAULT 60,
  start_otp VARCHAR(6),
  end_otp VARCHAR(6),
  otp_generated_at DATETIME,
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_start_time (start_time),
  INDEX idx_status (status),
  INDEX idx_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Activity enrollments (student-activity mapping)
CREATE TABLE activity_enrollments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  activity_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (activity_id, student_id),
  INDEX idx_activity (activity_id),
  INDEX idx_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attendance records (OTP-based tracking)
CREATE TABLE attendance_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  activity_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  start_marked_at DATETIME,
  end_marked_at DATETIME,
  status ENUM('present', 'absent', 'late', 'left_early', 'on_leave') DEFAULT 'absent',
  duration_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (activity_id, student_id),
  INDEX idx_activity (activity_id),
  INDEX idx_student (student_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Leave requests
CREATE TABLE leave_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  activity_id BIGINT NOT NULL,
  leave_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_activity (activity_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications table (track course assignment accept/reject)
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

-- Insert sample users (password: 'admin123' or 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password, user_type) VALUES
('Admin User', 'admin@college.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'admin'),
('Dr. Rajesh Kumar', 'rajesh@college.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'faculty'),
('Prof. Priya Sharma', 'priya@college.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'faculty'),
('Rahul Verma', 'rahul@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student'),
('Sneha Patel', 'sneha@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student'),
('Arjun Singh', 'arjun@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student'),
('Ananya Desai', 'ananya@student.edu', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36Z1Y1fG5L3agYJwfPiS0um', 'student');

-- Insert sample activities
INSERT INTO activities (title, description, owner_id, start_time, end_time, location, max_students, status) VALUES
('Database Management Lab', 'Practical session on SQL queries and normalization', 1, '2026-04-07 09:00:00', '2026-04-07 11:00:00', 'Lab 301', 60, 'scheduled'),
('Web Development Workshop', 'Introduction to React and Node.js', 2, '2026-04-07 14:00:00', '2026-04-07 16:00:00', 'Lab 205', 50, 'scheduled'),
('Data Structures Class', 'Trees and Graph algorithms', 1, '2026-04-08 10:00:00', '2026-04-08 12:00:00', 'Room 401', 70, 'scheduled');

-- Enroll sample students
INSERT INTO activity_enrollments (activity_id, student_id) VALUES
(1, 3), (1, 4), (1, 5), (1, 6),
(2, 3), (2, 5),
(3, 4), (3, 6);

-- Sample leave request
INSERT INTO leave_requests (student_id, activity_id, leave_date, reason, status) VALUES
(3, 1, '2026-04-07', 'Medical appointment', 'pending');