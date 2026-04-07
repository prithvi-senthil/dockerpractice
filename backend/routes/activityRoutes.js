const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/activitiesController");
const { auth, requireRole } = require("../middleware/auth");

// ── MORE SPECIFIC ROUTES FIRST ──
// SESSIONS (specific paths before parameter-based ones)
router.get("/sessions", auth, ctrl.getAllSessions);
router.get("/sessions/:id", auth, ctrl.getSessionById);
router.get(
  "/sessions/:id/students",
  auth,
  requireRole("admin", "faculty"),
  ctrl.getSessionStudents,
);
router.post(
  "/sessions/:id/generate-start-otp",
  auth,
  requireRole("faculty"),
  ctrl.generateStartOTP,
);
router.post(
  "/sessions/:id/generate-end-otp",
  auth,
  requireRole("faculty"),
  ctrl.generateEndOTP,
);

// COURSES (specific paths)
router.post("/courses", auth, requireRole("admin"), ctrl.createCourse);
router.get("/courses", auth, ctrl.getCourses);
router.get("/courses/:id", auth, ctrl.getCourseById);
router.post(
  "/courses/:courseId/students",
  auth,
  requireRole("admin", "faculty"),
  ctrl.addStudentsToCourse,
);
router.get(
  "/courses/:courseId/students",
  auth,
  requireRole("admin", "faculty"),
  ctrl.getCourseStudents,
);
router.get("/courses/:courseId/sessions", auth, ctrl.getCourseSessions);

// FACULTY (for assignment)
router.get("/faculty", auth, ctrl.getFaculty);

// STUDENTS (for adding to courses)
router.get("/students", auth, ctrl.getStudents);

// SCHEDULE CONFLICT CHECK
router.post(
  "/check-conflict",
  auth,
  requireRole("admin", "faculty"),
  ctrl.checkScheduleConflict,
);

// ── BACKWARD COMPATIBILITY - Legacy /activities endpoints (parameter-based routes last) ──
router.post("/", auth, requireRole("admin", "faculty"), ctrl.createCourse);
router.get(
  "/:id/students",
  auth,
  requireRole("admin", "faculty"),
  ctrl.getCourseStudents,
);
router.get("/:id", auth, ctrl.getCourseById);
router.get("/", auth, ctrl.getCourses);

module.exports = router;
