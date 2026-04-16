const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/adminCourseController");
const { auth, requireRole } = require("../middleware/auth");

/**
 * ADMIN COURSE MANAGEMENT ROUTES
 * All routes require admin authentication
 * Admin has global visibility and approval authority
 */

// ============================================================
// COURSE APPROVAL WORKFLOW (ADMIN ONLY)
// ============================================================

/**
 * GET /api/admin/courses - View ALL courses from ALL departments
 * Shows pending, approved, and rejected courses with approval status
 */
router.get(
  "/courses",
  auth,
  requireRole("admin"),
  adminCtrl.getAllCoursesAsAdmin,
);

/**
 * GET /api/admin/courses/:id - View specific course with details
 */
router.get(
  "/courses/:id",
  auth,
  requireRole("admin"),
  adminCtrl.getCourseDetailsAsAdmin,
);

/**
 * POST /api/admin/courses/:id/approve - APPROVE course from HOD
 * Course becomes visible to students and becomes active
 */
router.post(
  "/courses/:id/approve",
  auth,
  requireRole("admin"),
  adminCtrl.approveCourseAsAdmin,
);

/**
 * POST /api/admin/courses/:id/reject - REJECT course from HOD
 * Course is archived and not visible to students
 */
router.post(
  "/courses/:id/reject",
  auth,
  requireRole("admin"),
  adminCtrl.rejectCourseAsAdmin,
);

// ============================================================
// COURSE CREATION & STUDENT ASSIGNMENT (ADMIN DIRECT)
// ============================================================

/**
 * POST /api/admin/courses - Admin creates a course directly
 * (Not through HOD, auto-approved)
 */
router.post(
  "/courses",
  auth,
  requireRole("admin"),
  adminCtrl.createCourseAsAdmin,
);

/**
 * POST /api/admin/courses/assign-students - Bulk assign students to course
 */
router.post(
  "/courses/assign-students",
  auth,
  requireRole("admin"),
  adminCtrl.assignStudentsToCourseAsAdmin,
);

// ============================================================
// AUDIT & REPORTING (ADMIN ONLY)
// ============================================================

/**
 * GET /api/admin/audit-logs - View all system audit logs
 * Query params: ?action=CREATE&entity_type=COURSE&limit=100&offset=0
 */
router.get(
  "/audit-logs",
  auth,
  requireRole("admin"),
  adminCtrl.getAuditLogsAsAdmin,
);

/**
 * GET /api/admin/stats - Admin dashboard statistics
 * Shows counts: HODs, faculty, students, courses by status, leaves by status
 */
router.get(
  "/stats",
  auth,
  requireRole("admin"),
  adminCtrl.getAdminStatsAsAdmin,
);

module.exports = router;
