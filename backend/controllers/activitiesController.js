const db = require('../config/db');
const { generateOTP, isOTPValid } = require('../utils/otpGenerator');

// Create activity (Faculty only)
exports.create = async (req, res) => {
  try {
    const { title, description, start_time, end_time, location, max_students } = req.body;
    const owner_id = req.user.id;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start_time, and end_time are required' });
    }

    const [result] = await db.query(
      `INSERT INTO activities (title, description, owner_id, start_time, end_time, location, max_students, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [title, description, owner_id, start_time, end_time, location, max_students || 60]
    );

    res.status(201).json({
      message: 'Activity created successfully',
      activityId: result.insertId
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

// Get all activities (with filters)
exports.getAll = async (req, res) => {
  try {
    const { date, status } = req.query;
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query = `
      SELECT a.*, u.name as owner_name,
             (SELECT COUNT(*) FROM activity_enrollments WHERE activity_id = a.id) as enrolled_count
      FROM activities a
      JOIN users u ON a.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Students see only their enrolled activities
    if (userType === 'student') {
      query += ` AND a.id IN (SELECT activity_id FROM activity_enrollments WHERE student_id = ?)`;
      params.push(userId);
    }
    // Faculty see only their own activities
    else if (userType === 'faculty') {
      query += ` AND a.owner_id = ?`;
      params.push(userId);
    }

    if (date) {
      query += ` AND DATE(a.start_time) = ?`;
      params.push(date);
    }

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.start_time ASC`;

    const [activities] = await db.query(query, params);
    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

// Get activity by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [activities] = await db.query(
      `SELECT a.*, u.name as owner_name,
              (SELECT COUNT(*) FROM activity_enrollments WHERE activity_id = a.id) as enrolled_count
       FROM activities a
       JOIN users u ON a.owner_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(activities[0]);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

// Generate START OTP (Faculty only)
exports.generateStartOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const [activities] = await db.query('SELECT owner_id FROM activities WHERE id = ?', [id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    if (activities[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const otp = generateOTP();

    await db.query(
      `UPDATE activities SET start_otp = ?, otp_generated_at = NOW(), status = 'ongoing' WHERE id = ?`,
      [otp, id]
    );

    res.json({ 
      otp, 
      message: 'Start OTP generated successfully',
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('Generate OTP error:', error);
    res.status(500).json({ error: 'Failed to generate OTP' });
  }
};

// Generate END OTP (Faculty only)
exports.generateEndOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check ownership
    const [activities] = await db.query('SELECT owner_id FROM activities WHERE id = ?', [id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    if (activities[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const otp = generateOTP();

    await db.query(
      `UPDATE activities SET end_otp = ?, status = 'completed' WHERE id = ?`,
      [otp, id]
    );

    res.json({ 
      otp, 
      message: 'End OTP generated successfully',
      expiresIn: '10 minutes'
    });
  } catch (error) {
    console.error('Generate end OTP error:', error);
    res.status(500).json({ error: 'Failed to generate end OTP' });
  }
};

// Enroll student in activity
exports.enrollStudent = async (req, res) => {
  try {
    const { activityId } = req.body;
    const studentId = req.user.id;

    // Check if already enrolled
    const [existing] = await db.query(
      'SELECT id FROM activity_enrollments WHERE activity_id = ? AND student_id = ?',
      [activityId, studentId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this activity' });
    }

    // Check max students
    const [activity] = await db.query(
      `SELECT max_students, 
              (SELECT COUNT(*) FROM activity_enrollments WHERE activity_id = ?) as enrolled_count
       FROM activities WHERE id = ?`,
      [activityId, activityId]
    );

    if (activity.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    if (activity[0].enrolled_count >= activity[0].max_students) {
      return res.status(400).json({ error: 'Activity is full' });
    }

    await db.query(
      'INSERT INTO activity_enrollments (activity_id, student_id, enrolled_at) VALUES (?, ?, NOW())',
      [activityId, studentId]
    );

    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
};

// Get enrolled students (Faculty only)
exports.getEnrolledStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const [students] = await db.query(
      `SELECT u.id, u.name, u.email, ae.enrolled_at,
              ar.status as attendance_status, ar.start_marked_at, ar.end_marked_at
       FROM activity_enrollments ae
       JOIN users u ON ae.student_id = u.id
       LEFT JOIN attendance_records ar ON ar.activity_id = ae.activity_id AND ar.student_id = u.id
       WHERE ae.activity_id = ?
       ORDER BY u.name`,
      [id]
    );

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};