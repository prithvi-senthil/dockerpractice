const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/leaveRequestsController");
const { auth, requireRole } = require("../middleware/auth");
const {
  canApproveRequest,
  enforceDepartmentIsolation,
} = require("../middleware/authEnhanced");

// Student creates leave request
router.post("/", auth, requireRole("student"), ctrl.create);

// View leaves with RBAC filtering
// Students see own leaves, Faculty see their students' leaves, HOD sees department, Admin sees all
router.get("/", auth, enforceDepartmentIsolation, ctrl.getAll);

// Approve/Reject leave - uses enhanced RBAC approval check
router.patch("/:id", auth, canApproveRequest, ctrl.updateStatus);

// Leave summary endpoints
router.get("/summary/:studentId", auth, ctrl.getLeaveSummary);
router.get("/my-summary", auth, requireRole("student"), ctrl.getLeaveSummary);

module.exports = router;
