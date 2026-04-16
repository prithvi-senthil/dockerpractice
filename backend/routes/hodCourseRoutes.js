const express = require("express");
const router = express.Router();
const hodCtrl = require("../controllers/hodCourseController");
const { auth, requireRole } = require("../middleware/auth");

/**
 * HOD COURSE MANAGEMENT ROUTES
 * All routes require HOD authentication
 * Data strictly filtered to HOD's department only
 */

// ============================================================
// COURSE MANAGEMENT (HOD ONLY - DEPARTMENT ISOLATED)
// ============================================================

/**
 * GET /api/hod/my-courses - Get all courses in your department
 * Cannot see other HOD's courses
 */
router.get("/my-courses", auth, requireRole("hod"), hodCtrl.getMyCoursesAsHOD);

/**
 * POST /api/hod/courses - Create a new course for your department
 * Course status: PENDING (admin must approve)
 * Faculty must be from your department
 */
router.post("/courses", auth, requireRole("hod"), hodCtrl.createCourseAsHOD);

/**
 * POST /api/hod/courses/:id/assign-faculty - Reassign faculty to your course
 * Faculty must report to your HOD ID
 * Course must belong to your department
 */
router.post(
  "/courses/:id/assign-faculty",
  auth,
  requireRole("hod"),
  hodCtrl.assignFacultyToCourseasHOD,
);

// ============================================================
// FACULTY MANAGEMENT (HOD ONLY - DEPARTMENT ISOLATED)
// ============================================================

/**
 * GET /api/hod/my-faculty - Get all faculty in your department
 * Cannot see other HOD's faculty
 */
router.get("/my-faculty", auth, requireRole("hod"), hodCtrl.getMyFacultyAsHOD);

// ============================================================
// LEAVE MANAGEMENT (HOD ONLY)
// ============================================================

/**
 * GET /api/hod/my-leaves - Get all leave requests from your faculty
 * Cannot see other HOD's faculty leaves
 */
router.get("/my-leaves", auth, requireRole("hod"), hodCtrl.getMyLeavesAsHOD);

/**
 * PATCH /api/hod/leaves/:id/approve - Approve/Reject faculty leave
 * You can only approve leaves from faculty reporting to you
 */
router.patch(
  "/leaves/:id/approve",
  auth,
  requireRole("hod"),
  hodCtrl.approveLeaveasHOD,
);

// ============================================================
// STATISTICS & AUDIT (HOD ONLY)
// ============================================================

/**
 * GET /api/hod/stats - Department statistics dashboard
 * Shows: faculty count, courses (pending/approved), pending leaves, enrolled students
 */
router.get("/stats", auth, requireRole("hod"), hodCtrl.getHODStatsAsHOD);

/**
 * GET /api/hod/audit-log - View your own activity logs
 * Cannot see other HOD's activities
 */
router.get("/audit-log", auth, requireRole("hod"), hodCtrl.getHODAuditLogAsHOD);

module.exports = router;
