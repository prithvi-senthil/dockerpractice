const db = require("../config/db");

/**
 * Middleware to enforce HOD data isolation
 * HODs can only see/access data for their own department
 * Admins can see everything
 */
const requireHODAuthorization = async (req, res, next) => {
  try {
    if (req.user.user_type === "admin") {
      // Admin can see everything
      req.hod_id = null; // null means no filter for admins
      next();
    } else if (req.user.user_type === "hod") {
      // HOD can only see their own data
      req.hod_id = req.user.id;
      next();
    } else {
      return res.status(403).json({
        error: "Only HOD and Admin can access this resource",
      });
    }
  } catch (error) {
    console.error("HOD authorization error:", error);
    res.status(500).json({ error: "Authorization failed" });
  }
};

/**
 * Check if HOD owns a course
 */
const checkCourseOwnership = async (req, res, next) => {
  try {
    const courseId = req.params.id || req.body.course_id;
    const userId = req.user.id;
    const userType = req.user.user_type;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    const [course] = await db.query(`SELECT hod_id FROM courses WHERE id = ?`, [
      courseId,
    ]);

    if (!course.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Admin can access any course
    if (userType === "admin") {
      next();
      return;
    }

    // HOD can only access their own course
    if (userType === "hod" && course[0].hod_id === userId) {
      next();
      return;
    }

    return res.status(403).json({
      error: "You do not have permission to access this course",
    });
  } catch (error) {
    console.error("Course ownership check error:", error);
    res.status(500).json({ error: "Permission check failed" });
  }
};

/**
 * Check if HOD can access faculty
 */
const checkFacultyAccess = async (req, res, next) => {
  try {
    const facultyId = req.params.id || req.body.faculty_id;
    const userId = req.user.id;
    const userType = req.user.user_type;

    if (!facultyId) {
      return res.status(400).json({ error: "Faculty ID is required" });
    }

    const [faculty] = await db.query(
      `SELECT report_to FROM users WHERE id = ?`,
      [facultyId],
    );

    if (!faculty.length) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Admin can access any faculty
    if (userType === "admin") {
      next();
      return;
    }

    // HOD can only access faculty who report to them
    if (userType === "hod" && faculty[0].report_to === userId) {
      next();
      return;
    }

    return res.status(403).json({
      error: "You do not have permission to access this faculty",
    });
  } catch (error) {
    console.error("Faculty access check error:", error);
    res.status(500).json({ error: "Permission check failed" });
  }
};

module.exports = {
  requireHODAuthorization,
  checkCourseOwnership,
  checkFacultyAccess,
};
