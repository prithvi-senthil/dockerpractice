const db = require("../config/db");

// ============================================================
// HOD COURSE MANAGEMENT
// ============================================================

// GET /api/hod/courses - Get all courses for HOD (only their courses)
exports.getMyCoursesAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    const [courses] = await db.query(
      `SELECT c.*, u.name as faculty_name, COUNT(ce.id) as student_count
       FROM courses c
       LEFT JOIN users u ON c.assigned_faculty_id = u.id
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE c.hod_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [hodId],
    );

    res.json({
      courses,
      message: `Retrieved ${courses.length} courses for HOD`,
    });
  } catch (error) {
    console.error("Get HOD courses error:", error);
    res.status(500).json({ error: "Failed to fetch HOD courses" });
  }
};

// POST /api/hod/courses - Create course as HOD (only for their department)
exports.createCourseAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const {
      title,
      code,
      description,
      assigned_faculty_id,
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
          "Missing required fields: title, code, assigned_faculty_id, start_date, end_date, time_slot_start, time_slot_end",
      });
    }

    // Check if faculty reports to this HOD
    const [faculty] = await db.query(
      `SELECT id, name, report_to FROM users WHERE id = ? AND report_to = ?`,
      [assigned_faculty_id, hodId],
    );

    if (!faculty.length) {
      return res.status(403).json({
        error: "Faculty does not report to you. Cannot assign course.",
      });
    }

    // Get HOD details for department
    const [hod] = await db.query(`SELECT department FROM users WHERE id = ?`, [
      hodId,
    ]);

    const [result] = await db.query(
      `INSERT INTO courses 
       (title, course_code, description, assigned_faculty_id, hod_id, department, 
        start_date, end_date, schedule_days, time_slot_start, time_slot_end, 
        assignment_status, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', 'active', ?, NOW())`,
      [
        title,
        code,
        description,
        assigned_faculty_id,
        hodId,
        hod[0]?.department || "Department",
        start_date,
        end_date,
        schedule_days || "Monday,Wednesday,Friday",
        time_slot_start,
        time_slot_end,
        hodId,
      ],
    );

    // Log HOD action
    await db.query(
      `INSERT INTO hod_audit_logs (hod_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE_COURSE', 'COURSE', ?, ?)`,
      [
        hodId,
        result.insertId,
        JSON.stringify({ title, code, faculty_id: assigned_faculty_id }),
      ],
    );

    res.status(201).json({
      message: "Course created successfully by HOD",
      courseId: result.insertId,
      course: {
        id: result.insertId,
        title,
        code,
        assigned_faculty_id,
        hod_id: hodId,
        department: hod[0]?.department,
      },
    });
  } catch (error) {
    console.error("Create course as HOD error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

// POST /api/hod/courses/:id/assign-faculty - Assign faculty to course
exports.assignFacultyTosCourseAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const courseId = req.params.id;
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ error: "faculty_id is required" });
    }

    // Check if course belongs to this HOD
    const [course] = await db.query(
      `SELECT id, title FROM courses WHERE id = ? AND hod_id = ?`,
      [courseId, hodId],
    );

    if (!course.length) {
      return res
        .status(403)
        .json({ error: "Course does not belong to your department" });
    }

    // Check if faculty reports to this HOD
    const [faculty] = await db.query(
      `SELECT id, name FROM users WHERE id = ? AND report_to = ?`,
      [faculty_id, hodId],
    );

    if (!faculty.length) {
      return res.status(403).json({
        error: "Faculty does not report to you. Cannot assign.",
      });
    }

    // Check if already assigned
    const [existing] = await db.query(
      `SELECT id FROM course_enrollments WHERE course_id = ? AND user_id = ? AND role = 'faculty'`,
      [courseId, faculty_id],
    );

    if (existing.length) {
      return res
        .status(409)
        .json({ error: "Faculty is already assigned to this course" });
    }

    // Assign faculty
    const [result] = await db.query(
      `INSERT INTO course_enrollments (course_id, user_id, role, status, assigned_by, assigned_at)
       VALUES (?, ?, 'faculty', 'active', ?, NOW())`,
      [courseId, faculty_id, hodId],
    );

    // Log HOD action
    await db.query(
      `INSERT INTO hod_audit_logs (hod_id, action, entity_type, entity_id, details)
       VALUES (?, 'ASSIGN_FACULTY', 'ASSIGNMENT', ?, ?)`,
      [
        hodId,
        result.insertId,
        JSON.stringify({
          course_id: courseId,
          faculty_id,
          faculty_name: faculty[0]?.name,
        }),
      ],
    );

    res.status(201).json({
      message: "Faculty assigned to course successfully",
      assignment_id: result.insertId,
      faculty_name: faculty[0]?.name,
    });
  } catch (error) {
    console.error("Assign faculty to course error:", error);
    res.status(500).json({ error: "Failed to assign faculty" });
  }
};

// ============================================================
// HOD FACULTY MANAGEMENT
// ============================================================

// GET /api/hod/faculty - Get all faculty reporting to this HOD
exports.getMyFacultyAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    const [faculty] = await db.query(
      `SELECT u.id, u.name, u.email, u.department, 
              COUNT(DISTINCT c.id) as course_count,
              COUNT(DISTINCT ce.id) as student_count
       FROM users u
       LEFT JOIN courses c ON c.assigned_faculty_id = u.id
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE u.report_to = ? AND u.user_type = 'faculty'
       GROUP BY u.id
       ORDER BY u.name`,
      [hodId],
    );

    res.json({
      faculty,
      count: faculty.length,
    });
  } catch (error) {
    console.error("Get HOD faculty error:", error);
    res.status(500).json({ error: "Failed to fetch faculty" });
  }
};

// ============================================================
// HOD LEAVE MANAGEMENT
// ============================================================

// GET /api/hod/leaves - Get leave requests from faculty reporting to this HOD
exports.getLeaveRequestsAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;

    const [leaves] = await db.query(
      `SELECT lr.*, u.name as faculty_name, u.email as faculty_email, 
              c.title as course_title
       FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       LEFT JOIN courses c ON lr.course_id = c.id
       WHERE u.report_to = ? AND u.user_type = 'faculty'
       ORDER BY lr.created_at DESC`,
      [hodId],
    );

    res.json({
      leaves,
      count: leaves.length,
    });
  } catch (error) {
    console.error("Get HOD leaves error:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

// PATCH /api/hod/leaves/:id/approve - Approve/Reject leave as HOD
exports.approveLeaveAsHOD = async (req, res) => {
  try {
    const hodId = req.user.id;
    const leaveId = req.params.id;
    const { status, rejection_reason } = req.body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res
        .status(400)
        .json({ error: 'status must be "APPROVED" or "REJECTED"' });
    }

    // Check if leave belongs to faculty reporting to this HOD
    const [leave] = await db.query(
      `SELECT lr.*, u.report_to FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       WHERE lr.id = ? AND u.report_to = ?`,
      [leaveId, hodId],
    );

    if (!leave.length) {
      return res.status(403).json({
        error: "Leave request does not belong to your faculty",
      });
    }

    // Update leave status
    await db.query(
      `UPDATE leave_requests 
       SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [status, rejection_reason || null, hodId, leaveId],
    );

    // Log HOD action
    await db.query(
      `INSERT INTO hod_audit_logs (hod_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'LEAVE_REQUEST', ?, ?)`,
      [
        hodId,
        `LEAVE_${status}`,
        leaveId,
        JSON.stringify({
          leave_id: leaveId,
          faculty_id: leave[0].student_id,
          reason: rejection_reason,
        }),
      ],
    );

    res.json({
      message: `Leave request ${status.toLowerCase()} by HOD`,
      leave_id: leaveId,
      status,
    });
  } catch (error) {
    console.error("Approve leave as HOD error:", error);
    res.status(500).json({ error: "Failed to approve leave" });
  }
};

// ============================================================
// HOD AUDIT LOG
// ============================================================

// GET /api/hod/audit-log - Get HOD's activity log
exports.getHODAuditLog = async (req, res) => {
  try {
    const hodId = req.user.id;

    const [logs] = await db.query(
      `SELECT * FROM hod_audit_logs 
       WHERE hod_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [hodId],
    );

    res.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Get HOD audit log error:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
};

// ============================================================
// HOD STATISTICS
// ============================================================

// GET /api/hod/stats - Get HOD dashboard statistics
exports.getHODStats = async (req, res) => {
  try {
    const hodId = req.user.id;

    // Count faculty
    const [facultyCount] = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE report_to = ? AND user_type = 'faculty'`,
      [hodId],
    );

    // Count courses
    const [courseCount] = await db.query(
      `SELECT COUNT(*) as count FROM courses WHERE hod_id = ?`,
      [hodId],
    );

    // Count pending leaves
    const [pendingLeaves] = await db.query(
      `SELECT COUNT(*) as count FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       WHERE u.report_to = ? AND lr.status = 'PENDING'`,
      [hodId],
    );

    res.json({
      stats: {
        total_faculty: facultyCount[0]?.count || 0,
        total_courses: courseCount[0]?.count || 0,
        pending_leaves: pendingLeaves[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Get HOD stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};
