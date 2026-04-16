const express = require("express");
const router = express.Router();
const studentCtrl = require("../controllers/studentController");
const { auth, requireRole } = require("../middleware/auth");

/**
 * STUDENT ROUTES - STRICT PERMISSION LIMITS
 * Students can ONLY:
 * 1. Mark attendance with OTP
 * 2. View own attendance & leave records
 * 3. View own attendance percentage & leave percentage
 * 4. Request leaves
 */

// ============================================================
// ATTENDANCE MARKING (OTP ONLY)
// ============================================================

/**
 * POST /api/student/attendance/mark-start
 * Student marks start attendance by entering OTP provided by faculty
 */
router.post(
  "/attendance/mark-start",
  auth,
  requireRole("student"),
  studentCtrl.markStartAttendance,
);

/**
 * POST /api/student/attendance/mark-end
 * Student completes attendance marking
 */
router.post(
  "/attendance/mark-end",
  auth,
  requireRole("student"),
  studentCtrl.markEndAttendance,
);

// ============================================================
// VIEW OWN ATTENDANCE RECORDS
// ============================================================

/**
 * GET /api/student/attendance/my-records
 * Student views only their own attendance records
 * Optional query: ?month=3&year=2026 to filter by month
 */
router.get(
  "/attendance/my-records",
  auth,
  requireRole("student"),
  studentCtrl.getMyAttendanceRecords,
);

/**
 * GET /api/student/attendance/percentage
 * Student views their attendance percentage
 * Shows: total activities, present, absent, on_leave, attendance_percentage
 */
router.get(
  "/attendance/percentage",
  auth,
  requireRole("student"),
  studentCtrl.getAttendancePercentage,
);

// ============================================================
// LEAVE MANAGEMENT (STUDENT ONLY)
// ============================================================

/**
 * POST /api/student/leaves/request
 * Student requests a leave
 * Required: start_date, end_date, reason
 * Optional: activity_id, leave_type, is_half_day, half_day_type
 */
router.post(
  "/leaves/request",
  auth,
  requireRole("student"),
  studentCtrl.requestLeave,
);

/**
 * GET /api/student/leaves/my-requests
 * Student views only their own leave requests
 * Shows: pending, approved, rejected leaves
 */
router.get(
  "/leaves/my-requests",
  auth,
  requireRole("student"),
  studentCtrl.getMyLeaveRequests,
);

/**
 * GET /api/student/leaves/percentage
 * Student views their leave statistics
 * Shows: total requests, approved, pending, rejected, total approved days
 */
router.get(
  "/leaves/percentage",
  auth,
  requireRole("student"),
  studentCtrl.getLeavePercentage,
);

module.exports = router;
