const db = require("../config/db");
const { isOTPValid } = require("../utils/otpGenerator");
const auditLog = require("../utils/auditLog");

/**
 * STUDENT CONTROLLER - STRICT PERMISSION LIMITS
 * Students can ONLY:
 * 1. Mark attendance with OTP
 * 2. View their own attendance records
 * 3. View their own leave percentage
 * 4. Request leaves
 *
 * Students CANNOT:
 * - Approve/Reject anything
 * - View other students' data
 * - Create activities/courses
 * - Manage faculty
 */

// ============================================================
// ATTENDANCE MARKING (OTP ONLY)
// ============================================================

/**
 * POST /api/student/attendance/mark-start - Student marks start attendance with OTP
 * OTP provided by faculty
 */
exports.markStartAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { activity_id, otp } = req.body;

    if (!activity_id || !otp) {
      return res.status(400).json({ error: "activity_id and otp required" });
    }

    // Get activity and verify OTP
    const [activities] = await db.query(
      `SELECT start_otp, otp_generated_at FROM activities WHERE id = ?`,
      [activity_id],
    );

    if (!activities.length) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const activity = activities[0];

    // Verify OTP
    if (activity.start_otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Check OTP expiry (usually 15 minutes)
    if (!isOTPValid(activity.otp_generated_at)) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Check if student is enrolled in activity
    const [enrollment] = await db.query(
      `SELECT id FROM activity_enrollments WHERE activity_id = ? AND student_id = ?`,
      [activity_id, studentId],
    );

    if (!enrollment.length) {
      return res.status(403).json({ error: "Not enrolled in this activity" });
    }

    // Check if already marked
    const [existing] = await db.query(
      `SELECT id FROM attendance_records WHERE activity_id = ? AND student_id = ?`,
      [activity_id, studentId],
    );

    if (existing.length) {
      return res.status(400).json({ error: "Attendance already marked" });
    }

    // Mark attendance
    await db.query(
      `INSERT INTO attendance_records (activity_id, student_id, start_marked_at, status, created_at) 
       VALUES (?, ?, NOW(), 'present', NOW())`,
      [activity_id, studentId],
    );

    // Log student action
    await auditLog(
      studentId,
      "MARK_START",
      "ATTENDANCE",
      activity_id,
      "STUDENT_MARK_START_ATTENDANCE",
      null,
      { activity_id },
      `Student marked start attendance for activity #${activity_id}`,
    );

    res.json({ message: "Start attendance marked successfully" });
  } catch (error) {
    console.error("Mark start error:", error);
    res.status(500).json({ error: "Failed to mark attendance" });
  }
};

/**
 * POST /api/student/attendance/mark-end - Student marks end attendance
 */
exports.markEndAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { activity_id } = req.body;

    if (!activity_id) {
      return res.status(400).json({ error: "activity_id required" });
    }

    // Get attendance record
    const [records] = await db.query(
      "SELECT id, start_marked_at FROM attendance_records WHERE activity_id = ? AND student_id = ?",
      [activity_id, studentId],
    );

    if (!records.length) {
      return res.status(400).json({ error: "Start attendance not marked" });
    }

    const record = records[0];

    // Calculate duration
    const startTime = new Date(record.start_marked_at);
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime - startTime) / 1000 / 60);

    // Update record
    await db.query(
      `UPDATE attendance_records 
       SET end_marked_at = NOW(), duration_minutes = ?, status = 'present'
       WHERE id = ?`,
      [durationMinutes, record.id],
    );

    // Log student action
    await auditLog(
      studentId,
      "MARK_END",
      "ATTENDANCE",
      activity_id,
      "STUDENT_MARK_END_ATTENDANCE",
      null,
      { activity_id, duration_minutes: durationMinutes },
      `Student marked end attendance for activity #${activity_id}`,
    );

    res.json({
      message: "End attendance marked successfully",
      duration: `${durationMinutes} minutes`,
    });
  } catch (error) {
    console.error("Mark end error:", error);
    res.status(500).json({ error: "Failed to mark end attendance" });
  }
};

// ============================================================
// VIEW OWN ATTENDANCE
// ============================================================

/**
 * GET /api/student/attendance/my-records - View only OWN attendance records
 */
exports.getMyAttendanceRecords = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    let query = `
      SELECT ar.*, a.title, a.start_time, a.end_time, a.location
      FROM attendance_records ar
      JOIN activities a ON ar.activity_id = a.id
      WHERE ar.student_id = ?
    `;
    const params = [studentId];

    if (month && year) {
      query += ` AND MONTH(a.start_time) = ? AND YEAR(a.start_time) = ?`;
      params.push(month, year);
    }

    query += ` ORDER BY a.start_time DESC`;

    const [records] = await db.query(query, params);
    res.json({
      attendance_records: records,
      total_records: records.length,
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

// ============================================================
// VIEW LEAVE PERCENTAGE & ATTENDANCE PERCENTAGE
// ============================================================

/**
 * GET /api/student/attendance/percentage - Student views their attendance percentage
 */
exports.getAttendancePercentage = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [stats] = await db.query(
      `SELECT 
         COUNT(*) as total_activities,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_count,
         CASE 
           WHEN COUNT(*) = 0 THEN 0
           ELSE ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2)
         END as attendance_percentage
       FROM attendance_records
       WHERE student_id = ?`,
      [studentId],
    );

    const stat = stats[0] || {
      total_activities: 0,
      present_count: 0,
      absent_count: 0,
      leave_count: 0,
      attendance_percentage: 0,
    };

    res.json({
      attendance_summary: {
        total_activities: stat.total_activities,
        present: stat.present_count,
        absent: stat.absent_count,
        on_leave: stat.leave_count,
        attendance_percentage: parseFloat(stat.attendance_percentage) || 0,
      },
      message: "Your attendance overview",
    });
  } catch (error) {
    console.error("Get percentage error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

/**
 * GET /api/student/leaves/percentage - Student views their leave percentage
 */
exports.getLeavePercentage = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get all leave requests
    const [leaves] = await db.query(
      `SELECT 
         COUNT(*) as total_leaves,
         SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approved_leaves,
         SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_leaves,
         SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_leaves
       FROM leave_requests
       WHERE student_id = ?`,
      [studentId],
    );

    const leave = leaves[0] || {
      total_leaves: 0,
      approved_leaves: 0,
      pending_leaves: 0,
      rejected_leaves: 0,
    };

    // Calculate leave days
    const [leaveDetails] = await db.query(
      `SELECT 
         SUM(DATEDIFF(end_date, start_date)) as total_leave_days
       FROM leave_requests
       WHERE student_id = ? AND status = 'APPROVED'`,
      [studentId],
    );

    const totalLeaveDays = leaveDetails[0]?.total_leave_days || 0;

    res.json({
      leave_summary: {
        total_requests: leave.total_leaves,
        approved_requests: leave.approved_leaves,
        pending_requests: leave.pending_leaves,
        rejected_requests: leave.rejected_leaves,
        total_approved_days: totalLeaveDays,
      },
      message: "Your leave overview",
    });
  } catch (error) {
    console.error("Get leave percentage error:", error);
    res.status(500).json({ error: "Failed to fetch leave data" });
  }
};

// ============================================================
// REQUEST LEAVE (STUDENT ONLY)
// ============================================================

/**
 * POST /api/student/leaves/request - Student requests a leave
 */
exports.requestLeave = async (req, res) => {
  try {
    const studentId = req.user.id;
    const {
      activity_id,
      start_date,
      end_date,
      reason,
      leave_type,
      is_half_day,
      half_day_type,
    } = req.body;

    if (!start_date || !end_date || !reason) {
      return res
        .status(400)
        .json({ error: "start_date, end_date, reason required" });
    }

    // Create leave request
    const [result] = await db.query(
      `INSERT INTO leave_requests 
       (student_id, activity_id, leave_type, start_date, end_date, reason, is_half_day, half_day_type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW())`,
      [
        studentId,
        activity_id || null,
        leave_type || "CASUAL",
        start_date,
        end_date,
        reason,
        is_half_day || 0,
        half_day_type || null,
      ],
    );

    // Log student action
    await auditLog(
      studentId,
      "REQUEST",
      "LEAVE",
      result.insertId,
      "STUDENT_REQUEST_LEAVE",
      null,
      { leave_type, start_date, end_date },
      `Student requested leave from ${start_date} to ${end_date}`,
    );

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveId: result.insertId,
      status: "PENDING",
      note: "Your leave request is pending approval",
    });
  } catch (error) {
    console.error("Request leave error:", error);
    res.status(500).json({ error: "Failed to submit leave request" });
  }
};

/**
 * GET /api/student/leaves/my-requests - Student views ONLY their own leaves
 */
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [leaves] = await db.query(
      `SELECT * FROM leave_requests 
       WHERE student_id = ? 
       ORDER BY created_at DESC`,
      [studentId],
    );

    const summary = {
      total: leaves.length,
      approved: leaves.filter((l) => l.status === "APPROVED").length,
      pending: leaves.filter((l) => l.status === "PENDING").length,
      rejected: leaves.filter((l) => l.status === "REJECTED").length,
    };

    res.json({
      leave_requests: leaves,
      summary,
      message: "Your leave requests only",
    });
  } catch (error) {
    console.error("Get leaves error:", error);
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};
