const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceController");
const { auth, requireRole } = require("../middleware/auth");

router.post("/mark-start", auth, requireRole("student"), ctrl.markStart);
router.post("/mark-end", auth, requireRole("student"), ctrl.markEnd);
router.get(
  "/my-attendance",
  auth,
  requireRole("student", "faculty", "admin"),
  ctrl.getMyAttendance,
);
router.get(
  "/summary",
  auth,
  requireRole("student", "faculty", "admin"),
  ctrl.getAttendanceSummary,
);
router.get(
  "/session/:id/report",
  auth,
  requireRole("faculty", "admin"),
  ctrl.getSessionReport,
);

module.exports = router;
