const express = require("express");
const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const hodController = require("../controllers/hodController");

// ============================================================
// COURSE MANAGEMENT (HOD ONLY)
// ============================================================

// GET /api/hod/courses - Get all courses for HOD
router.get(
  "/courses",
  auth,
  requireRole("hod"),
  hodController.getMyCoursesAsHOD,
);

// POST /api/hod/courses - Create course as HOD
router.post(
  "/courses",
  auth,
  requireRole("hod"),
  hodController.createCourseAsHOD,
);

// POST /api/hod/courses/:id/assign-faculty - Assign faculty to course
router.post(
  "/courses/:id/assign-faculty",
  auth,
  requireRole("hod"),
  hodController.assignFacultyTosCourseAsHOD,
);

// ============================================================
// FACULTY MANAGEMENT (HOD ONLY)
// ============================================================

// GET /api/hod/faculty - Get all faculty reporting to HOD
router.get(
  "/faculty",
  auth,
  requireRole("hod"),
  hodController.getMyFacultyAsHOD,
);

// ============================================================
// LEAVE MANAGEMENT (HOD ONLY)
// ============================================================

// GET /api/hod/leaves - Get leave requests from reporting faculty
router.get(
  "/leaves",
  auth,
  requireRole("hod"),
  hodController.getLeaveRequestsAsHOD,
);

// PATCH /api/hod/leaves/:id/approve - Approve/Reject leave
router.patch(
  "/leaves/:id/approve",
  auth,
  requireRole("hod"),
  hodController.approveLeaveAsHOD,
);

// ============================================================
// AUDIT LOG (HOD ONLY)
// ============================================================

// GET /api/hod/audit-log - Get HOD's activity log
router.get(
  "/audit-log",
  auth,
  requireRole("hod"),
  hodController.getHODAuditLog,
);

// ============================================================
// STATISTICS (HOD ONLY)
// ============================================================

// GET /api/hod/stats - Get HOD dashboard statistics
router.get("/stats", auth, requireRole("hod"), hodController.getHODStats);

module.exports = router;
