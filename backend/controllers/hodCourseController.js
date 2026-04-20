const db = require("../config/db");
const auditLog = require("../utils/auditLog");

/**
 * HOD COURSE MANAGEMENT WITH STRICT DEPARTMENT ISOLATION
 * HOD can only:
 * 1. Create courses for their department
 * 2. Assign faculty from their department
 * 3. See only their department's courses
 *
 * HOD CANNOT:
 * - See other HOD's courses or faculty
 * - Approve/reject courses (admin does that)
 * - Assign students directly (admin does that)
 */

// ============================================================
// HOD COURSE MANAGEMENT (DEPARTMENT ONLY)
// ============================================================

/**
 * GET /api/hod/my-courses - HOD views ONLY their department's courses
 * Strict isolation: cannot see other HOD's courses
 */
exports.getMyCoursesAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Query courses WHERE:
    // 1. Created by this HOD (management view)
    // 2. Assigned to this HOD as faculty (acceptance view)
    // 3. Assigned to faculty under this HOD (oversight view)
    const [courses] = await db.query(
      `SELECT c.id, c.title, c.course_code as code, c.description, c.start_date, c.end_date,
              c.assignment_status, c.created_at, c.assigned_faculty_id,
              c.department_id,
              f.name as faculty_name, f.email as faculty_email,
              d.name as department_name
       FROM courses c
       LEFT JOIN users f ON c.assigned_faculty_id = f.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.created_by = ?
          OR c.assigned_faculty_id = ?
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = c.assigned_faculty_id AND u.report_to = ?)
       ORDER BY c.created_at DESC`,
      [hodId, hodId, hodId],
    );

    // Get student enrollment counts for each course
    const coursesWithEnrollments = await Promise.all(
      courses.map(async (course) => {
        const [enrollments] = await db.query(
          `SELECT COUNT(DISTINCT ce.student_id) as enrolled_students
           FROM course_enrollments ce
           WHERE ce.course_id = ?`,
          [course.id],
        );
        return {
          ...course,
          enrolled_students: enrollments[0]?.enrolled_students || 0,
        };
      }),
    );

    res.json({
      courses: coursesWithEnrollments,
      total_courses: coursesWithEnrollments.length,
      department: `Your Department (HOD #${hodId})`,
    });
  } catch (error) {
    console.error("Get HOD courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

/**
 * POST /api/hod/courses - HOD creates a course for their department
 * Course is in PENDING status until admin approves
 */
exports.createCourseAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const {
      title,
      code,
      description,
      assigned_faculty_id,
      department_id,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !code ||
      !assigned_faculty_id ||
      !start_date ||
      !end_date ||
      !time_slot_start ||
      !time_slot_end
    ) {
      return res.status(400).json({
        error:
          "Missing required: title, code, assigned_faculty_id, start_date, end_date, time_slot_start, time_slot_end",
      });
    }

    // Verify department if provided
    let courseDepartmentId = department_id;
    if (department_id) {
      const [dept] = await db.query(
        `SELECT id FROM departments WHERE id = ? AND hod_id = ?`,
        [department_id, hodId],
      );
      if (!dept.length) {
        return res.status(403).json({
          error: "You are not the HOD of this department",
        });
      }
      courseDepartmentId = dept[0].id;
    }

    // CRITICAL: Verify faculty reports to THIS HOD (department isolation)
    const [faculty] = await db.query(
      `SELECT id, name FROM users WHERE id = ? AND report_to = ? AND user_type = 'faculty'`,
      [assigned_faculty_id, hodId],
    );

    if (!faculty.length) {
      return res.status(403).json({
        error: "Faculty must be in your department to assign",
        details: "Selected faculty does not report to your HOD ID",
      });
    }

    // Create course with HOD as creator
    const [result] = await db.query(
      `INSERT INTO courses 
       (title, course_code, description, assigned_faculty_id,
        department_id, start_date, end_date, schedule_days, time_slot_start, time_slot_end,
        assignment_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        title,
        code,
        description,
        assigned_faculty_id,
        courseDepartmentId || null,
        start_date,
        end_date,
        schedule_days || "Monday,Wednesday,Friday",
        time_slot_start,
        time_slot_end,
        hodId,
      ],
    );

    // Log HOD action
    await auditLog(
      hodId,
      "CREATE",
      "COURSE",
      result.insertId,
      null,
      null,
      { title, code, faculty_name: faculty[0].name },
      `HOD created course: ${title} (awaiting admin approval)`,
    );

    res.status(201).json({
      message: "Course created successfully (pending admin approval)",
      courseId: result.insertId,
      status: "pending",
      assigned_faculty: faculty[0].name,
      note: "Admin must approve this course before students can enroll",
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

/**
 * POST /api/hod/courses/:id/assign-faculty - Reassign faculty to course
 * HOD can only reassign if they own the course
 */
exports.assignFacultyToCourseasHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const courseId = req.params.id;
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ error: "faculty_id is required" });
    }

    // CRITICAL: Verify course belongs to this HOD
    const [course] = await db.query(
      `SELECT id, title FROM courses WHERE id = ? AND created_by = ?`,
      [courseId, hodId],
    );

    if (!course.length) {
      return res.status(403).json({
        error: "You can only modify courses in your department",
      });
    }

    // CRITICAL: Verify faculty reports to THIS HOD
    const [faculty] = await db.query(
      `SELECT id, name FROM users WHERE id = ? AND report_to = ? AND user_type = 'faculty'`,
      [faculty_id, hodId],
    );

    if (!faculty.length) {
      return res.status(403).json({
        error: "Faculty must be in your department",
      });
    }

    // Update faculty assignment
    await db.query(`UPDATE courses SET assigned_faculty_id = ? WHERE id = ?`, [
      faculty_id,
      courseId,
    ]);

    // Log HOD action
    await auditLog(
      hodId,
      "UPDATE",
      "COURSE_FACULTY",
      courseId,
      "HOD_ASSIGN_FACULTY",
      null,
      { new_faculty: faculty_id, new_faculty_name: faculty[0].name },
      `HOD reassigned faculty to course: ${course[0].title}`,
    );

    res.json({
      message: "Faculty assigned successfully",
      courseId,
      faculty_name: faculty[0].name,
    });
  } catch (error) {
    console.error("Assign faculty error:", error);
    res.status(500).json({ error: "Failed to assign faculty" });
  }
};

/**
 * DELETE /api/hod/courses/:id - HOD deletes their course
 * Can only delete courses belonging to their department
 * Deletes course and all related enrollments/sessions
 */
exports.deleteCourseasHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const courseId = req.params.id;

    // CRITICAL: Verify course belongs to this HOD only
    const [courses] = await db.query(
      `SELECT id, title FROM courses WHERE id = ? AND created_by = ?`,
      [courseId, hodId],
    );

    if (!courses.length) {
      return res.status(403).json({
        error: "You can only delete courses in your department",
      });
    }

    // Delete all enrollments first (cascade)
    await db.query(`DELETE FROM course_enrollments WHERE course_id = ?`, [
      courseId,
    ]);

    // Delete all sessions
    await db.query(`DELETE FROM course_sessions WHERE course_id = ?`, [
      courseId,
    ]);

    // Delete the course
    await db.query(`DELETE FROM courses WHERE id = ?`, [courseId]);

    // Log the deletion
    await auditLog(
      hodId,
      "DELETE",
      "COURSE",
      courseId,
      null,
      null,
      { deleted_course: courses[0] },
      `HOD deleted course: ${courses[0].title}`,
    );

    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
};

/**
 * POST /api/hod/courses/:id/accept - HOD accepts a course assignment
 * Can only accept courses directly assigned to them (assignment_status = 'pending')
 */
exports.acceptCourseAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const courseId = req.params.id;

    // Verify course is assigned to this HOD and is pending
    const [courses] = await db.query(
      `SELECT id, title, assignment_status FROM courses WHERE id = ? AND assigned_faculty_id = ?`,
      [courseId, hodId],
    );

    if (!courses.length) {
      return res
        .status(404)
        .json({ error: "Course not found or not assigned to you" });
    }

    if (courses[0].assignment_status !== "pending") {
      return res.status(400).json({
        error: `Cannot accept course with status: ${courses[0].assignment_status}`,
      });
    }

    // Accept the course
    await db.query(
      `UPDATE courses SET assignment_status = 'accepted', accepted_at = NOW() WHERE id = ?`,
      [courseId],
    );

    // Log HOD action
    await auditLog(
      hodId,
      "ACCEPT",
      "COURSE",
      courseId,
      null,
      null,
      { course_title: courses[0].title },
      `HOD accepted course assignment: ${courses[0].title}`,
    );

    res.json({
      message: "Course accepted successfully",
      courseId,
      status: "accepted",
    });
  } catch (error) {
    console.error("Accept course error:", error);
    res.status(500).json({ error: "Failed to accept course" });
  }
};

/**
 * POST /api/hod/courses/:id/reject - HOD rejects a course assignment
 * Can only reject courses directly assigned to them (assignment_status = 'pending')
 */
exports.rejectCourseAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const courseId = req.params.id;
    const { rejection_reason } = req.body;

    // Verify course is assigned to this HOD and is pending
    const [courses] = await db.query(
      `SELECT id, title, assignment_status FROM courses WHERE id = ? AND assigned_faculty_id = ?`,
      [courseId, hodId],
    );

    if (!courses.length) {
      return res
        .status(404)
        .json({ error: "Course not found or not assigned to you" });
    }

    if (courses[0].assignment_status !== "pending") {
      return res.status(400).json({
        error: `Cannot reject course with status: ${courses[0].assignment_status}`,
      });
    }

    // Reject the course
    await db.query(
      `UPDATE courses SET assignment_status = 'rejected', rejected_at = NOW() WHERE id = ?`,
      [courseId],
    );

    // Log HOD action
    await auditLog(
      hodId,
      "REJECT",
      "COURSE",
      courseId,
      null,
      null,
      { course_title: courses[0].title, reason: rejection_reason },
      `HOD rejected course assignment: ${courses[0].title}`,
    );

    res.json({
      message: "Course rejected successfully",
      courseId,
      status: "rejected",
    });
  } catch (error) {
    console.error("Reject course error:", error);
    res.status(500).json({ error: "Failed to reject course" });
  }
};

/**
 * GET /api/hod/my-faculty - HOD views ONLY their faculty
 * Strict isolation: cannot see other HOD's faculty
 */
exports.getMyFacultyAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Query ONLY faculty who report to this HOD
    const [faculty] = await db.query(
      `SELECT u.id, u.name, u.email,
              COUNT(DISTINCT c.id) as assigned_courses
       FROM users u
       LEFT JOIN courses c ON u.id = c.assigned_faculty_id AND c.created_by = ?
       WHERE u.report_to = ? AND u.user_type = 'faculty'
       GROUP BY u.id
       ORDER BY u.name`,
      [hodId, hodId],
    );

    res.json({
      faculty,
      total_faculty: faculty.length,
      message: "Your department faculty only",
    });
  } catch (error) {
    console.error("Get faculty error:", error);
    res.status(500).json({ error: "Failed to fetch faculty" });
  }
};

// ============================================================
// HOD LEAVE MANAGEMENT
// ============================================================

/**
 * GET /api/hod/my-leaves - HOD views ONLY their faculty's leave requests
 */
exports.getMyLeavesAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Query leaves only from faculty reporting to this HOD
    const [leaves] = await db.query(
      `SELECT lr.*,
              u.name as faculty_name,
              u.email as faculty_email
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE u.report_to = ? AND u.user_type = 'faculty'
       ORDER BY lr.created_at DESC`,
      [hodId],
    );

    const pending = leaves.filter((l) => l.status === "PENDING").length;
    const approved = leaves.filter((l) => l.status === "APPROVED").length;
    const rejected = leaves.filter((l) => l.status === "REJECTED").length;

    res.json({
      leaves,
      total: leaves.length,
      summary: { pending, approved, rejected },
    });
  } catch (error) {
    console.error("Get HOD leaves error:", error);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

/**
 * PATCH /api/hod/leaves/:id/approve - HOD approves faculty leave
 */
exports.approveLeaveasHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const leaveId = req.params.id;
    const { status, rejection_reason } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Status must be APPROVED or REJECTED" });
    }

    // Get leave request and verify faculty reports to this HOD
    const [leaves] = await db.query(
      `SELECT lr.*, u.name as faculty_name
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE lr.id = ? AND u.report_to = ? AND u.user_type = 'faculty'`,
      [leaveId, hodId],
    );

    if (!leaves.length) {
      return res.status(403).json({
        error: "You can only approve leave requests from your faculty",
      });
    }

    const leave = leaves[0];

    // Update leave status
    await db.query(
      `UPDATE leave_requests 
       SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?
       WHERE id = ?`,
      [status, hodId, rejection_reason || null, leaveId],
    );

    // Log HOD action
    await auditLog(
      hodId,
      status === "APPROVED" ? "APPROVE" : "REJECT",
      "LEAVE_REQUEST",
      leaveId,
      "HOD_LEAVE_" + status,
      { status: "PENDING" },
      { status, rejection_reason },
      `HOD ${status} faculty leave for: ${leave.faculty_name}`,
    );

    res.json({
      message: `Leave request ${status} successfully`,
      leaveId,
      status,
    });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ error: "Failed to process leave" });
  }
};

// ============================================================
// HOD STATISTICS & AUDIT
// ============================================================

/**
 * GET /api/hod/stats - HOD dashboard showing department statistics
 */
exports.getHODStatsAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    const [stats] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE report_to = ? AND user_type = 'faculty') as total_faculty,
        (SELECT COUNT(*) FROM courses WHERE created_by = ?) as my_courses,
        (SELECT COUNT(*) FROM courses WHERE created_by = ? AND assignment_status = 'pending') as pending_approval,
        (SELECT COUNT(*) FROM courses WHERE created_by = ? AND assignment_status = 'accepted') as approved_courses,
        (SELECT COUNT(*) FROM leave_requests lr 
         JOIN users u ON lr.student_id = u.id 
         WHERE u.report_to = ? AND lr.status = 'pending') as pending_leaves,
        (SELECT SUM(CASE WHEN ce.student_id IS NOT NULL THEN 1 ELSE 0 END) FROM courses c
         LEFT JOIN course_enrollments ce ON c.id = ce.course_id
         WHERE c.created_by = ?) as total_enrolled_students
      `,
      [hodId, hodId, hodId, hodId, hodId, hodId],
    );

    res.json({
      department_summary: stats[0],
      message: "Your department statistics only",
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

/**
 * GET /api/hod/audit-log - HOD views only THEIR OWN activity logs
 */
exports.getHODAuditLogAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const [logs] = await db.query(
      `SELECT * FROM audit_logs 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [hodId, parseInt(limit), parseInt(offset)],
    );

    res.json({
      logs,
      count: logs.length,
      message: "Your action logs only",
    });
  } catch (error) {
    console.error("Get audit log error:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};
