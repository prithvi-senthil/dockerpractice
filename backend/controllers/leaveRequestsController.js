const db = require('../config/db');

exports.create = async (req, res) => {
  try {
    const { activity_id, leave_date, reason } = req.body;
    const student_id = req.user.id;

    if (!activity_id || !leave_date || !reason) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await db.query(
      `INSERT INTO leave_requests (student_id, activity_id, leave_date, reason, status, created_at) 
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [student_id, activity_id, leave_date, reason]
    );

    res.status(201).json({
      message: 'Leave request submitted',
      leaveId: result.insertId
    });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query = `
      SELECT lr.*, u.name as student_name, a.title as activity_title, faculty.name as faculty_name
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      JOIN activities a ON lr.activity_id = a.id
      JOIN users faculty ON a.faculty_id = faculty.id
      WHERE 1=1
    `;
    const params = [];

    if (userType === 'student') {
      query += ` AND lr.student_id = ?`;
      params.push(userId);
    } else if (userType === 'faculty') {
      query += ` AND a.faculty_id = ?`;
      params.push(userId);
    }

    query += ` ORDER BY lr.created_at DESC`;

    const [requests] = await db.query(query, params);
    res.json(requests);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const userId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [leave] = await db.query(
      `SELECT lr.*, a.faculty_id 
       FROM leave_requests lr 
       JOIN activities a ON lr.activity_id = a.id 
       WHERE lr.id = ?`,
      [id]
    );

    if (leave.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave[0].faculty_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await db.query(
      `UPDATE leave_requests SET status = ?, remarks = ?, updated_at = NOW() WHERE id = ?`,
      [status, remarks, id]
    );

    if (status === 'approved') {
      await db.query(
        `INSERT INTO attendance_records (activity_id, student_id, status, created_at) 
         VALUES (?, ?, 'on_leave', NOW())
         ON DUPLICATE KEY UPDATE status = 'on_leave'`,
        [leave[0].activity_id, leave[0].student_id]
      );
    }

    res.json({ message: `Leave request ${status}` });
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
};