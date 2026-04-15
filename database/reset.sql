SET FOREIGN_KEY_CHECKS=0;

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
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS system_settings;

SET FOREIGN_KEY_CHECKS=1;
