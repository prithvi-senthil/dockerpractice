const db = require("../config/db");
const auditLog = require("../utils/auditLog");

/**
 * ADMIN COURSE APPROVAL SYSTEM
 * Admin can view all courses from all departments and approve/reject them
 * Admin can also create courses and assign students directly
 */

// ============================================================
// ADMIN COURSE MANAGEMENT (GLOBAL VISIBILITY)
// ============================================================

/**
 * GET /api/admin/courses - Admin sees ALL courses from ALL departments
 * Includes approval status and department info
 */
exports.getAllCoursesAsAdmin = async (req, res) => {
  try {
    const [courses] = await db.query(
      `SELECT c.*, 
              u.name as hod_name,
              f.name as faculty_name,
              COUNT(DISTINCT ce.id) as total_students,
              SUM(CASE WHEN c.approval_status = 'PENDING' THEN 1 ELSE 0 END) as pending_courses
       FROM courses c
       LEFT JOIN users u ON c.hod_id = u.id
       LEFT JOIN users f ON c.assigned_faculty_id = f.id
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
    );

    res.json({
      courses,
      total_count: courses.length,
      by_status: {
        pending: courses.filter((c) => c.approval_status === "PENDING").length,
        approved: courses.filter((c) => c.approval_status === "APPROVED")
          .length,
        rejected: courses.filter((c) => c.approval_status === "REJECTED")
          .length,
      },
    });
  } catch (error) {
    console.error("Get all courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

/**
 * GET /api/admin/courses/:id - View specific course details (any department)
 */
exports.getCourseDetailsAsAdmin = async (req, res) => {
  try {
    const courseId = req.params.id;

    const [courses] = await db.query(
      `SELECT c.*,
              u.name as hod_name,
              u.email as hod_email,
              f.name as faculty_name,
              f.email as faculty_email,
              COUNT(DISTINCT ce.id) as enrolled_students
       FROM courses c
       LEFT JOIN users u ON c.hod_id = u.id
       LEFT JOIN users f ON c.assigned_faculty_id = f.id
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [courseId],
    );

    if (!courses.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courses[0];

    // Get enrolled students
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.name`,
      [courseId],
    );

    res.json({
      course,
      students,
      student_count: students.length,
    });
  } catch (error) {
    console.error("Get course details error:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
};

/**
 * POST /api/admin/courses/:id/approve - Admin approves a course
 * Once approved, course becomes visible to students
 */
exports.approveCourseAsAdmin = async (req, res) => {
  try {
    const courseId = req.params.id;
    const adminId = req.user.id;
    const { approval_notes } = req.body;

    // Get course details
    const [courses] = await db.query(`SELECT * FROM courses WHERE id = ?`, [
      courseId,
    ]);

    if (!courses.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courses[0];

    // Update course status
    await db.query(
      `UPDATE courses 
       SET approval_status = 'APPROVED',
           approved_by = ?,
           approved_at = NOW(),
           approval_notes = ?
       WHERE id = ?`,
      [adminId, approval_notes || null, courseId],
    );

    // Log admin action
    await auditLog(
      adminId,
      "APPROVE",
      "COURSE",
      courseId,
      "ADMIN_APPROVE_COURSE",
      { approval_status: "PENDING" },
      { approval_status: "APPROVED", approval_notes },
      `Admin approved course: ${course.title} from HOD ${course.hod_id}`,
    );

    res.json({
      message: "Course approved successfully",
      courseId,
      status: "APPROVED",
    });
  } catch (error) {
    console.error("Approve course error:", error);
    res.status(500).json({ error: "Failed to approve course" });
  }
};

/**
 * POST /api/admin/courses/:id/reject - Admin rejects a course
 */
exports.rejectCourseAsAdmin = async (req, res) => {
  try {
    const courseId = req.params.id;
    const adminId = req.user.id;
    const { rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({ error: "rejection_reason is required" });
    }

    // Get course details
    const [courses] = await db.query(`SELECT * FROM courses WHERE id = ?`, [
      courseId,
    ]);

    if (!courses.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courses[0];

    // Update course status
    await db.query(
      `UPDATE courses 
       SET approval_status = 'REJECTED',
           rejected_by = ?,
           rejected_at = NOW(),
           approval_notes = ?
       WHERE id = ?`,
      [adminId, rejection_reason, courseId],
    );

    // Log admin action
    await auditLog(
      adminId,
      "REJECT",
      "COURSE",
      courseId,
      "ADMIN_REJECT_COURSE",
      { approval_status: "PENDING" },
      { approval_status: "REJECTED", rejection_reason },
      `Admin rejected course: ${course.title} from HOD ${course.hod_id} - Reason: ${rejection_reason}`,
    );

    res.json({
      message: "Course rejected successfully",
      courseId,
      status: "REJECTED",
    });
  } catch (error) {
    console.error("Reject course error:", error);
    res.status(500).json({ error: "Failed to reject course" });
  }
};

/**
 * POST /api/admin/courses/assign-students - Admin directly assigns students to courses
 */
exports.assignStudentsToCourseAsAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { course_id, student_ids } = req.body;

    if (!course_id || !student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({
        error: "course_id and student_ids (array) are required",
      });
    }

    // Verify course exists
    const [courses] = await db.query(`SELECT title FROM courses WHERE id = ?`, [
      course_id,
    ]);

    if (!courses.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const courseName = courses[0].title;
    const enrolledCount = [];

    // Enroll each student
    for (const studentId of student_ids) {
      try {
        await db.query(
          `INSERT INTO course_enrollments 
           (course_id, student_id, role, assigned_by, assigned_at) 
           VALUES (?, ?, 'student', ?, NOW())
           ON DUPLICATE KEY UPDATE assigned_by = ?, assigned_at = NOW()`,
          [course_id, studentId, adminId, adminId],
        );
        enrolledCount.push(studentId);
      } catch (error) {
        console.error(`Failed to enroll student ${studentId}:`, error);
      }
    }

    // Log admin action
    await auditLog(
      adminId,
      "ASSIGN",
      "STUDENTS",
      course_id,
      "ADMIN_ASSIGN_STUDENTS",
      null,
      { student_count: enrolledCount.length, student_ids: enrolledCount },
      `Admin assigned ${enrolledCount.length} students to course: ${courseName}`,
    );

    res.json({
      message: "Students assigned successfully",
      course_id,
      enrolled_count: enrolledCount.length,
      enrolled_students: enrolledCount,
    });
  } catch (error) {
    console.error("Assign students error:", error);
    res.status(500).json({ error: "Failed to assign students" });
  }
};

/**
 * POST /api/admin/courses - Admin creates courses (not assigned to any HOD)
 */
exports.createCourseAsAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      title,
      code,
      description,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end,
    } = req.body;

    if (!title || !code || !start_date || !end_date) {
      return res.status(400).json({
        error: "title, code, start_date, end_date are required",
      });
    }

    const [result] = await db.query(
      `INSERT INTO courses 
       (title, code, description, start_date, end_date, 
        schedule_days, time_slot_start, time_slot_end,
        approval_status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, NOW())`,
      [
        title,
        code,
        description,
        start_date,
        end_date,
        schedule_days || "Monday,Wednesday,Friday",
        time_slot_start,
        time_slot_end,
        adminId,
      ],
    );

    // Log admin action
    await auditLog(
      adminId,
      "CREATE",
      "COURSE",
      result.insertId,
      "ADMIN_CREATE_COURSE",
      null,
      { title, code, start_date, end_date },
      `Admin created course: ${title}`,
    );

    res.json({
      message: "Course created successfully",
      courseId: result.insertId,
      status: "APPROVED",
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

// ============================================================
// ADMIN AUDIT LOG & REPORTING
// ============================================================

/**
 * GET /api/admin/audit-logs - View all audit logs (complete system activity)
 */
exports.getAuditLogsAsAdmin = async (req, res) => {
  try {
    const { action, entity_type, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT al.*,
             u.name as user_name,
             u.user_type as user_role
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (entity_type) {
      query += ` AND al.entity_type = ?`;
      params.push(entity_type);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await db.query(query, params);

    res.json({
      logs,
      count: logs.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

/**
 * GET /api/admin/stats - Admin dashboard statistics
 */
exports.getAdminStatsAsAdmin = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE user_type = 'hod') as total_hods,
        (SELECT COUNT(*) FROM users WHERE user_type = 'faculty') as total_faculty,
        (SELECT COUNT(*) FROM users WHERE user_type = 'student') as total_students,
        (SELECT COUNT(*) FROM courses WHERE approval_status = 'PENDING') as pending_courses,
        (SELECT COUNT(*) FROM courses WHERE approval_status = 'APPROVED') as approved_courses,
        (SELECT COUNT(*) FROM courses WHERE approval_status = 'REJECTED') as rejected_courses,
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING') as pending_leaves,
        (SELECT COUNT(*) FROM leave_requests WHERE status = 'APPROVED') as approved_leaves
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};
