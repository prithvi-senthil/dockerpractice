const db = require("../config/db");
const auditLog = require("../utils/auditLog");

// POST /api/leaves/create - Create a leave request
exports.create = async (req, res) => {
  try {
    const {
      course_id,
      start_date,
      end_date,
      reason,
      leave_type,
      is_half_day,
      half_day_type,
    } = req.body;
    const requester_id = req.user.id;
    const requester_type = req.user.user_type;

    if (!start_date || !end_date || !reason) {
      return res
        .status(400)
        .json({ error: "start_date, end_date and reason are required" });
    }

    // For student leave: course_id is required
    if (requester_type === "student" && !course_id) {
      return res
        .status(400)
        .json({ error: "course_id is required for student leave requests" });
    }

    // For faculty leave: course_id is required to identify the admin (course creator)
    if (requester_type === "faculty" && !course_id) {
      return res
        .status(400)
        .json({ error: "course_id is required for faculty leave requests" });
    }

    // Verify student is enrolled in the course (for student leaves)
    if (requester_type === "student" && course_id) {
      const [enrollment] = await db.query(
        `SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?`,
        [course_id, requester_id],
      );
      if (!enrollment.length) {
        return res
          .status(403)
          .json({ error: "You are not enrolled in this course" });
      }
    }

    // Verify faculty is assigned to the course (for faculty leaves)
    if (requester_type === "faculty" && course_id) {
      const [course] = await db.query(
        `SELECT id FROM courses WHERE id = ? AND assigned_faculty_id = ?`,
        [course_id, requester_id],
      );
      if (!course.length) {
        return res
          .status(403)
          .json({ error: "You are not assigned to this course" });
      }
    }

    const [result] = await db.query(
      `INSERT INTO leave_requests 
       (student_id, course_id, leave_type, start_date, end_date, reason, is_half_day, half_day_type, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
      [
        requester_id,
        course_id || null,
        leave_type || "CASUAL",
        start_date,
        end_date,
        reason,
        is_half_day || 0,
        half_day_type || null,
      ],
    );

    // Log the action
    await auditLog(
      requester_id,
      "CREATE",
      "LEAVE_REQUEST",
      result.insertId,
      `${requester_type.toUpperCase()} Leave Request`,
      null,
      { leave_type, start_date, end_date, reason },
      `${requester_type} submitted leave request from ${start_date} to ${end_date}`,
    );

    res.status(201).json({
      message: "Leave request submitted",
      leaveId: result.insertId,
    });
  } catch (error) {
    console.error("Create leave error:", error);
    res.status(500).json({ error: "Failed to create leave request" });
  }
};

// GET /api/leaves - Get leave requests with RBAC filtering
exports.getAll = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type;
    const isDepartmentFiltered = req.isDepartmentFiltered || false;
    const hodId = req.hodId || null;

    if (!userId || !userType) {
      return res
        .status(401)
        .json({ error: "User information missing from token" });
    }

    let query = `
      SELECT lr.*, 
             u.name as student_name, 
             u.user_type as student_type,
             u.report_to,
             a.title as activity_title,
             a.owner_id as faculty_id,
             f.name as faculty_name
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      LEFT JOIN activities a ON lr.activity_id = a.id
      LEFT JOIN users f ON a.owner_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (userType === "student") {
      // Students see only their own leave requests
      query += ` AND lr.student_id = ?`;
      params.push(userId);
    } else if (userType === "faculty") {
      // Faculty see:
      // 1. Their own leave requests (where they are the requester)
      // 2. Leave requests from their activity attendees
      query += ` AND (
        lr.student_id = ? 
        OR (lr.activity_id IS NOT NULL AND a.owner_id = ?)
      )`;
      params.push(userId, userId);
    } else if (userType === "hod" && isDepartmentFiltered && hodId) {
      // HOD sees leaves from faculty in their department
      query += ` AND u.report_to = ?`;
      params.push(hodId);
    }
    // Admin sees all (no filter)

    query += ` ORDER BY lr.created_at DESC`;

    const [requests] = await db.query(query, params);
    res.json({ leaves: requests || [], count: requests?.length || 0 });
  } catch (error) {
    console.error("Get leaves error:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

// PUT /api/leaves/:id - Approve/Reject a leave request
// Uses enhanced RBAC via canApproveRequest middleware
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const approver_id = req.user.id;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use APPROVED or REJECTED" });
    }

    // Get the complete leave request
    const [leave] = await db.query(
      `SELECT lr.*, 
              u.user_type as requester_type,
              u.name as requester_name,
              c.title as course_title
       FROM leave_requests lr 
       JOIN users u ON lr.student_id = u.id
       LEFT JOIN courses c ON lr.course_id = c.id 
       WHERE lr.id = ?`,
      [id],
    );

    if (!leave.length) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const leaveRecord = leave[0];

    // Update the leave request
    const updateData =
      status === "APPROVED"
        ? {
            status,
            approved_by: approver_id,
            approved_at: new Date(),
            rejected_at: null,
            rejection_reason: null,
          }
        : {
            status,
            approved_by: null,
            approved_at: null,
            rejected_at: new Date(),
            rejection_reason: rejection_reason || null,
          };

    await db.query(
      `UPDATE leave_requests 
       SET status = ?, approved_by = ?, approved_at = ?, rejected_at = ?, rejection_reason = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        updateData.status,
        updateData.approved_by,
        updateData.approved_at,
        updateData.rejected_at,
        updateData.rejection_reason,
        id,
      ],
    );

    // Log the action with full audit trail
    await auditLog(
      approver_id,
      status === "APPROVED" ? "APPROVE" : "REJECT",
      "LEAVE_REQUEST",
      id,
      `${leaveRecord.requester_type.toUpperCase()} Leave Request`,
      { status: "PENDING" },
      { status, rejection_reason, requester: leaveRecord.requester_name },
      `${status} leave request from ${leaveRecord.requester_name} (${leaveRecord.requester_type}) for ${leaveRecord.course_title || "General"}`,
    );

    // If approved, mark attendance as on_leave for those dates
    if (status === "APPROVED" && leaveRecord.course_id) {
      await db.query(
        `UPDATE session_attendance 
         SET status = 'on_leave', updated_at = NOW()
         WHERE student_id = ?
           AND session_id IN (
             SELECT id FROM course_sessions 
             WHERE course_id = ? 
               AND session_date BETWEEN ? AND ?
           )`,
        [
          leaveRecord.student_id,
          leaveRecord.course_id,
          leaveRecord.start_date,
          leaveRecord.end_date,
        ],
      );
    }

    res.json({
      message: `Leave request ${status.toLowerCase()}`,
      leave_id: id,
      status,
      approved_by: updateData.approved_by,
      approved_at: updateData.approved_at,
    });
  } catch (error) {
    console.error("Update leave error:", error);
    res.status(500).json({ error: "Failed to update leave request" });
  }
};

exports.getLeaveSummary = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.id;

    const [summary] = await db.query(
      `SELECT 
         COUNT(*) as total_requests,
         SUM(CASE WHEN status = 'APPROVED' THEN DATEDIFF(end_date, start_date) + 1 ELSE 0 END) as total_days_approved,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_count,
         SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count
       FROM leave_requests
       WHERE student_id = ?`,
      [studentId],
    );

    // Get attendance percentage
    const [attendance] = await db.query(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave_count,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count
       FROM session_attendance
       WHERE student_id = ?`,
      [studentId],
    );

    const totalSessions = attendance[0].total_sessions || 0;
    const presentCount = attendance[0].present_count || 0;
    const onLeaveCount = attendance[0].on_leave_count || 0;

    const attendancePercentage =
      totalSessions > 0
        ? Math.round(((presentCount + onLeaveCount) / totalSessions) * 100)
        : 0;

    res.json({
      leave_summary: summary[0],
      attendance_summary: {
        ...attendance[0],
        attendance_percentage: attendancePercentage,
      },
    });
  } catch (error) {
    console.error("Get leave summary error:", error);
    res.status(500).json({ error: "Failed to fetch leave summary" });
  }
};
