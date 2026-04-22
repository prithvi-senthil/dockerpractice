const express = require("express");
const router = express.Router();
const adminUserController = require("../controllers/adminUserController");
const { auth } = require("../middleware/auth");

// Protect all routes - must be admin
router.use(auth);

// Verify admin role
router.use((req, res, next) => {
  if (req.user.user_type !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
});

// ============================================================
// GENERIC USER CREATION
// ============================================================

/**
 * POST /api/admin/users
 * Create a new user by role (hod, faculty, or student)
 * Body: { name, email, user_type, department? }
 */
router.post("/users", adminUserController.createUser);

/**
 * GET /api/admin/users
 * Get all users separated by role (HODs, Faculty, Students)
 * Returns: { summary: {...}, users_by_role: {...} }
 */
router.get("/users", adminUserController.getAllUsersByRole);

// ============================================================
// HOD ROUTES
// ============================================================

/**
 * POST /api/admin/hods
 * Create a new HOD
 * Body: { name, email, department }
 */
router.post("/hods", adminUserController.createHOD);

/**
 * GET /api/admin/hods
 * Get all HODs
 */
router.get("/hods", adminUserController.getAllHODs);

/**
 * PATCH /api/admin/hods/:id
 * Update HOD details
 * Body: { name?, department?, is_active? }
 */
router.patch("/hods/:id", adminUserController.updateHOD);

/**
 * DELETE /api/admin/hods/:id
 * Delete a HOD
 */
router.delete("/hods/:id", adminUserController.deleteHOD);

// ============================================================
// FACULTY ROUTES
// ============================================================

/**
 * POST /api/admin/faculty
 * Create a new Faculty (assigned to HOD)
 * Body: { name, email, report_to (HOD ID) }
 */
router.post("/faculty", adminUserController.createFaculty);

/**
 * GET /api/admin/faculty
 * Get all Faculty with their HOD info
 */
router.get("/faculty", adminUserController.getAllFaculty);

/**
 * PATCH /api/admin/faculty/:id
 * Update Faculty details
 * Body: { name?, report_to?, is_active? }
 */
router.patch("/faculty/:id", adminUserController.updateFaculty);

/**
 * DELETE /api/admin/faculty/:id
 * Delete a Faculty member
 */
router.delete("/faculty/:id", adminUserController.deleteFaculty);

// ============================================================
// STUDENT ROUTES
// ============================================================

/**
 * POST /api/admin/students
 * Create a new Student
 * Body: { name, email }
 */
router.post("/students", adminUserController.createStudent);

/**
 * GET /api/admin/students
 * Get all Students
 */
router.get("/students", adminUserController.getAllStudents);

/**
 * PATCH /api/admin/students/:id
 * Update Student details
 * Body: { name?, is_active? }
 */
router.patch("/students/:id", adminUserController.updateStudent);

/**
 * DELETE /api/admin/students/:id
 * Delete a Student
 */
router.delete("/students/:id", adminUserController.deleteStudent);

module.exports = router;
