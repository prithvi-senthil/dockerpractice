const db = require("../config/db");
const { verifyOTP } = require("../config/redis");

// Student marks START attendance
exports.markStart = async (req, res) => {
  try {
    const { sessionId, otp } = req.body;
    const studentId = req.user.id;

    if (!sessionId || !otp) {
      return res.status(400).json({ error: "sessionId and otp are required" });
    }

    // Verify OTP from Redis with correct key format
    const verification = await verifyOTP(`start:session:${sessionId}`, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.reason });
    }

    // Check enrollment
    const [sessions] = await db.query(
      `SELECT cs.course_id FROM course_sessions cs WHERE cs.id = ?`,
      [sessionId],
    );
    if (sessions.length === 0)
      return res.status(404).json({ error: "Session not found" });

    const [enrolled] = await db.query(
      `SELECT id FROM course_enrollments WHERE course_id = ? AND student_id = ?`,
      [sessions[0].course_id, studentId],
    );
    if (enrolled.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not enrolled in this course" });
    }

    // Check if already marked
    const [existing] = await db.query(
      `SELECT id, start_marked_at FROM session_attendance WHERE session_id = ? AND student_id = ?`,
      [sessionId, studentId],
    );

    if (existing.length > 0 && existing[0].start_marked_at) {
      return res.status(400).json({ error: "Start attendance already marked" });
    }

    // Insert or update
    await db.query(
      `INSERT INTO session_attendance (session_id, student_id, start_marked_at, status, created_at)
       VALUES (?, ?, NOW(), 'present', NOW())
       ON DUPLICATE KEY UPDATE start_marked_at = NOW(), status = 'present'`,
      [sessionId, studentId],
    );

    res.json({ message: "Start attendance marked successfully" });
  } catch (error) {
    console.error("Mark start error:", error);
    res.status(500).json({ error: "Failed to mark start attendance" });
  }
};

// Student marks END attendance
exports.markEnd = async (req, res) => {
  try {
    const { sessionId, otp } = req.body;
    const studentId = req.user.id;

    if (!sessionId || !otp) {
      return res.status(400).json({ error: "sessionId and otp are required" });
    }

    const verification = await verifyOTP(`end:session:${sessionId}`, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.reason });
    }

    const [records] = await db.query(
      `SELECT id, start_marked_at FROM session_attendance WHERE session_id = ? AND student_id = ?`,
      [sessionId, studentId],
    );

    if (records.length === 0 || !records[0].start_marked_at) {
      return res.status(400).json({ error: "Start attendance not marked yet" });
    }

    const durationMinutes = Math.floor(
      (new Date() - new Date(records[0].start_marked_at)) / 60000,
    );

    await db.query(
      `UPDATE session_attendance SET end_marked_at = NOW(), duration_minutes = ? WHERE id = ?`,
      [durationMinutes, records[0].id],
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

// Student: view own attendance history
exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { course_id } = req.query;

    // Faculty users get empty array or their taught courses attendance
    if (userType === "faculty") {
      return res.json([]);
    }

    let query = `
      SELECT sa.*, cs.session_date, cs.start_time, cs.end_time,
             c.title as course_title, u.name as faculty_name
      FROM session_attendance sa
      JOIN course_sessions cs ON sa.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      JOIN users u ON c.assigned_faculty_id = u.id
      WHERE sa.student_id = ?
    `;
    const params = [userId];

    if (course_id) {
      query += ` AND cs.course_id = ?`;
      params.push(course_id);
    }

    query += ` ORDER BY cs.session_date DESC, cs.start_time DESC`;

    const [records] = await db.query(query, params);
    res.json(records);
  } catch (error) {
    console.error("Get my attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

// Student: attendance summary with percentage
exports.getAttendanceSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    // Faculty users get empty summary
    if (userType === "faculty") {
      return res.json({
        total_sessions: 0,
        present_count: 0,
        absent_count: 0,
        on_leave_count: 0,
        late_count: 0,
        attendance_percentage: 0,
        total_leave_requests: 0,
        approved_leave_days: 0,
      });
    }

    const [summary] = await db.query(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as on_leave_count,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
         ROUND(
           (SUM(CASE WHEN status IN ('present','on_leave') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0)) * 100, 
           2
         ) as attendance_percentage
       FROM session_attendance
       WHERE student_id = ?`,
      [userId],
    );

    // Leave summary
    const [leaveSummary] = await db.query(
      `SELECT 
         COUNT(*) as total_leave_requests,
         SUM(CASE WHEN status = 'APPROVED' THEN DATEDIFF(end_date, start_date) + 1 ELSE 0 END) as approved_leave_days
       FROM leave_requests
       WHERE student_id = ?`,
      [userId],
    );

    res.json({
      ...summary[0],
      ...leaveSummary[0],
    });
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

// Faculty: report for a session
exports.getSessionReport = async (req, res) => {
  try {
    const { id } = req.params;
    const [sessions] = await db.query(
      `SELECT cs.course_id FROM course_sessions cs WHERE cs.id = ?`,
      [id],
    );
    if (sessions.length === 0)
      return res.status(404).json({ error: "Session not found" });

    const [report] = await db.query(
      `SELECT u.id, u.name, u.email,
              COALESCE(sa.status, 'absent') as status,
              sa.start_marked_at, sa.end_marked_at, sa.duration_minutes
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       LEFT JOIN session_attendance sa ON sa.session_id = ? AND sa.student_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.name`,
      [id, sessions[0].course_id],
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session report" });
  }
};
