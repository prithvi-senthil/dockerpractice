const db = require("../config/db");

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
    const student_id = req.user.id;

    if (!start_date || !end_date || !reason) {
      return res
        .status(400)
        .json({ error: "start_date, end_date and reason are required" });
    }

    const [result] = await db.query(
      `INSERT INTO leave_requests 
       (student_id, course_id, leave_type, start_date, end_date, reason, is_half_day, half_day_type, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
      [
        student_id,
        course_id || null,
        leave_type || "CASUAL",
        start_date,
        end_date,
        reason,
        is_half_day || 0,
        half_day_type || null,
      ],
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

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query = `
      SELECT lr.*, 
             u.name as student_name, 
             a.title as activity_title,
             a.owner_id as faculty_id
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      JOIN activities a ON lr.activity_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (userType === "student") {
      query += ` AND lr.student_id = ?`;
      params.push(userId);
    } else if (userType === "faculty") {
      // Faculty sees leaves for activities they own
      query += ` AND a.owner_id = ?`;
      params.push(userId);
    }
    // admin sees all

    query += ` ORDER BY lr.created_at DESC`;

    const [requests] = await db.query(query, params);
    res.json(requests);
  } catch (error) {
    console.error("Get leaves error:", error);
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const userId = req.user.id;
    const userType = req.user.user_type;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Use APPROVED or REJECTED" });
    }

    const [leave] = await db.query(
      `SELECT lr.*, c.assigned_faculty_id 
       FROM leave_requests lr 
       LEFT JOIN courses c ON lr.course_id = c.id 
       WHERE lr.id = ?`,
      [id],
    );

    if (leave.length === 0) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    // Only faculty of that course or admin can approve
    if (userType === "faculty" && leave[0].assigned_faculty_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updateData =
      status === "APPROVED"
        ? {
            status,
            approved_by: userId,
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

    // If approved, update session_attendance records for those dates
    if (status === "APPROVED" && leave[0].course_id) {
      await db.query(
        `INSERT INTO session_attendance (session_id, student_id, status, created_at)
         SELECT cs.id, ?, 'on_leave', NOW()
         FROM course_sessions cs
         WHERE cs.course_id = ?
           AND cs.session_date BETWEEN ? AND ?
         ON DUPLICATE KEY UPDATE status = 'on_leave'`,
        [
          leave[0].student_id,
          leave[0].course_id,
          leave[0].start_date,
          leave[0].end_date,
        ],
      );
    }

    res.json({ message: `Leave request ${status.toLowerCase()}` });
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
