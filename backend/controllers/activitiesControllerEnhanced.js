const db = require("../config/db");
const auditLog = require("../utils/auditLog");

// ============================================================
// ENHANCED COURSE MANAGEMENT WITH HOD ISOLATION
// ============================================================

/**
 * GET /api/activities/courses
 * Enhanced to support HOD data isolation
 * - Admin: sees all courses across all HODs
 * - HOD: sees only their own courses
 * - Faculty: sees courses assigned to them
 * - Student: sees courses they're enrolled in
 */
exports.getCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    let query = `
      SELECT c.*, 
             u.name as faculty_name, 
             hod.name as hod_name,
             COUNT(DISTINCT ce.id) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.assigned_faculty_id = u.id
      LEFT JOIN users hod ON c.hod_id = hod.id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    `;
    const params = [];

    // Apply role-based filters
    if (userType === "admin") {
      // Admin sees all courses (no filter needed)
      query += ` WHERE 1=1`;
    } else if (userType === "hod") {
      // HOD sees only their courses
      query += ` WHERE c.hod_id = ?`;
      params.push(userId);
    } else if (userType === "faculty") {
      // Faculty sees:
      // 1. Courses assigned to them
      // 2. Courses from their HOD (if applicable)
      query += ` WHERE c.assigned_faculty_id = ? OR c.hod_id = (
        SELECT report_to FROM users WHERE id = ?
      )`;
      params.push(userId, userId);
    } else if (userType === "student") {
      // Students see only courses they're enrolled in
      query += ` WHERE c.id IN (
        SELECT DISTINCT course_id FROM course_enrollments WHERE student_id = ?
      )`;
      params.push(userId);
    }

    query += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const [courses] = await db.query(query, params);

    res.json({
      courses,
      count: courses.length,
      filtered_by: userType,
    });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

/**
 * GET /api/activities/courses/:id
 * Enhanced to check HOD permission
 */
exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;
    const userType = req.user.user_type;

    const [courses] = await db.query(
      `SELECT c.*, 
              u.name as faculty_name, 
              u.id as faculty_id,
              hod.name as hod_name,
              hod.id as hod_id,
              COUNT(DISTINCT ce.id) as enrolled_count
       FROM courses c
       LEFT JOIN users u ON c.assigned_faculty_id = u.id
       LEFT JOIN users hod ON c.hod_id = hod.id
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [courseId],
    );

    if (!courses.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courses[0];

    // Check permissions
    if (userType === "hod" && course.hod_id !== userId) {
      // HOD can only see their own courses
      return res.status(403).json({
        error: "This course belongs to another department",
      });
    } else if (userType === "faculty" && course.faculty_id !== userId) {
      // Faculty can only see assigned courses or courses from their HOD
      const [faculty] = await db.query(
        `SELECT report_to FROM users WHERE id = ?`,
        [userId],
      );

      if (!faculty.length || faculty[0].report_to !== course.hod_id) {
        return res.status(403).json({
          error: "You do not have access to this course",
        });
      }
    } else if (userType === "student") {
      // Check if student is enrolled
      const [enrollment] = await db.query(
        `SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?`,
        [courseId, userId],
      );

      if (!enrollment.length) {
        return res.status(403).json({
          error: "You are not enrolled in this course",
        });
      }
    }

    // Get enrolled students
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email 
       FROM course_enrollments ce
       JOIN users u ON ce.user_id = u.id
       WHERE ce.course_id = ? AND ce.role = 'student'`,
      [courseId],
    );

    res.json({
      course,
      faculty: course.faculty_name,
      hod: course.hod_name,
      enrolled_students: students,
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
};

/**
 * POST /api/activities/courses (ADMIN ONLY)
 * Admin can create courses and assign them to HODs
 */
exports.createCourse = async (req, res) => {
  try {
    if (req.user.user_type !== "admin") {
      return res.status(403).json({
        error:
          "Only admin can create courses directly. HOD should use /api/hod/courses",
      });
    }

    const {
      title,
      course_code,
      description,
      assigned_faculty_id,
      hod_id,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end,
    } = req.body;

    if (!title || !course_code || !start_date || !end_date) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const [result] = await db.query(
      `INSERT INTO courses 
       (title, course_code, description, assigned_faculty_id, hod_id,
        start_date, end_date, schedule_days, time_slot_start, time_slot_end,
        assignment_status, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', 'active', ?, NOW())`,
      [
        title,
        course_code,
        description,
        assigned_faculty_id,
        hod_id,
        start_date,
        end_date,
        schedule_days || "Monday,Wednesday,Friday",
        time_slot_start,
        time_slot_end,
        req.user.id,
      ],
    );

    // Log admin action
    await auditLog(
      req.user.id,
      "CREATE",
      "COURSE",
      result.insertId,
      "ADMIN_CREATE_COURSE",
      null,
      { title, course_code, hod_id },
      `Admin created course for HOD`,
    );

    res.status(201).json({
      message: "Course created successfully",
      courseId: result.insertId,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};
