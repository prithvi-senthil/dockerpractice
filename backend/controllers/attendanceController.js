const db = require('../config/db');
const { isOTPValid } = require('../utils/otpGenerator');

exports.markStart = async (req, res) => {
  try {
    const { activityId, otp } = req.body;
    const studentId = req.user.id;

    if (!activityId || !otp) {
      return res.status(400).json({ error: 'Activity ID and OTP required' });
    }

    const [activities] = await db.query(
      'SELECT start_otp, otp_generated_at FROM activities WHERE id = ?',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const activity = activities[0];

    if (activity.start_otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!isOTPValid(activity.otp_generated_at)) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Check if student is enrolled
    const [enrollment] = await db.query(
      `SELECT id FROM master_relationship_mapping 
       WHERE user = ? AND relation_user = ? AND relationship = (SELECT id FROM master_relationship WHERE relationship = 'activity-student' AND status = '1')`,
      [activityId, studentId]
    );

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this activity' });
    }

    const [existing] = await db.query(
      'SELECT id FROM attendance_records WHERE activity_id = ? AND student_id = ?',
      [activityId, studentId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Attendance already marked' });
    }

    await db.query(
      `INSERT INTO attendance_records (activity_id, student_id, start_marked_at, status, created_at) 
       VALUES (?, ?, NOW(), 'present', NOW())`,
      [activityId, studentId]
    );

    res.json({ message: 'Start attendance marked successfully' });
  } catch (error) {
    console.error('Mark start error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

exports.markEnd = async (req, res) => {
  try {
    const { activityId, otp } = req.body;
    const studentId = req.user.id;

    if (!activityId || !otp) {
      return res.status(400).json({ error: 'Activity ID and OTP required' });
    }

    const [activities] = await db.query(
      'SELECT end_otp FROM activities WHERE id = ?',
      [activityId]
    );

    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (activities[0].end_otp !== otp) {
      return res.status(400).json({ error: 'Invalid end OTP' });
    }

    const [records] = await db.query(
      'SELECT id, start_marked_at FROM attendance_records WHERE activity_id = ? AND student_id = ?',
      [activityId, studentId]
    );

    if (records.length === 0) {
      return res.status(400).json({ error: 'Start attendance not marked' });
    }

    const record = records[0];
    const startTime = new Date(record.start_marked_at);
    const endTime = new Date();
    const durationMinutes = Math.floor((endTime - startTime) / 1000 / 60);

    await db.query(
      `UPDATE attendance_records 
       SET end_marked_at = NOW(), duration_minutes = ? 
       WHERE id = ?`,
      [durationMinutes, record.id]
    );

    res.json({ 
      message: 'End attendance marked successfully',
      duration: `${durationMinutes} minutes`
    });
  } catch (error) {
    console.error('Mark end error:', error);
    res.status(500).json({ error: 'Failed to mark end attendance' });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { month, year } = req.query;

    let query = `
      SELECT ar.*, a.title, a.start_time, a.end_time, a.location,
             u.name as faculty_name
      FROM attendance_records ar
      JOIN activities a ON ar.activity_id = a.id
      JOIN users u ON a.faculty_id = u.id
      WHERE ar.student_id = ?
    `;
    const params = [studentId];

    if (month && year) {
      query += ` AND MONTH(a.start_time) = ? AND YEAR(a.start_time) = ?`;
      params.push(month, year);
    }

    query += ` ORDER BY a.start_time DESC`;

    const [records] = await db.query(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const studentId = req.user.id;

    const [summary] = await db.query(
      `SELECT 
         COUNT(*) as total_activities,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_count,
         ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as attendance_percentage
       FROM attendance_records
       WHERE student_id = ?`,
      [studentId]
    );

    res.json(summary[0]);
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};

exports.getActivityReport = async (req, res) => {
  try {
    const { id } = req.params;

    const [report] = await db.query(
      `SELECT u.id, u.name, u.email,
              ar.status, ar.start_marked_at, ar.end_marked_at, ar.duration_minutes
       FROM master_relationship_mapping mrm
       JOIN users u ON mrm.relation_user = u.id
       LEFT JOIN attendance_records ar ON ar.activity_id = mrm.user AND ar.student_id = u.id
       WHERE mrm.user = ? AND mrm.relationship = (SELECT id FROM master_relationship WHERE relationship = 'activity-student' AND status = '1')
       ORDER BY u.name`,
      [id]
    );

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};