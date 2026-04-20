const express = require("express");
const router = express.Router();
const deptCtrl = require("../controllers/departmentController");
const { auth, requireRole } = require("../middleware/auth");

/**
 * DEPARTMENT ROUTES
 * Admin and HOD can manage departments
 */

/**
 * GET /api/departments - Get all departments
 */
router.get("/", auth, deptCtrl.getAllDepartments);

/**
 * GET /api/departments/:id - Get specific department
 */
router.get("/:id", auth, deptCtrl.getDepartmentById);

/**
 * POST /api/departments - Create new department (Admin and HOD)
 */
router.post("/", auth, requireRole("admin", "hod"), deptCtrl.createDepartment);

/**
 * PUT /api/departments/:id - Update department (Admin only)
 */
router.put("/:id", auth, requireRole("admin"), deptCtrl.updateDepartment);

module.exports = router;
