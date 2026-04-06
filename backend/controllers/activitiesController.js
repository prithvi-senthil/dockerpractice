const db = require('../config/db');
const { generateOTP, isOTPValid } = require('../utils/otpGenerator');
const { storeOTP, verifyOTP, getActiveOTP } = require('../config/redis');

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
    await storeOTP(id, otp, userId);

    await db.query(
      `UPDATE activities SET start_otp = ?, otp_generated_at = NOW(), status = 'ongoing' WHERE id = ?`,
      [otp, id]
    );

    res.json({ 
      otp, 
      message: 'Start OTP generated successfully',
      expires_in_seconds: 300
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

    const [activities] = await db.query('SELECT owner_id FROM activities WHERE id = ?', [id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    if (activities[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const otp = generateOTP();
    await storeOTP(`${id}-end`, otp, userId); // Different key for end OTP

    await db.query(
      `UPDATE activities SET end_otp = ?, status = 'completed' WHERE id = ?`,
      [otp, id]
    );

    res.json({ 
      otp, 
      message: 'End OTP generated successfully',
      expires_in_seconds: 300
    });
  } catch (error) {
    console.error('Generate end OTP error:', error);
    res.status(500).json({ error: 'Failed to generate end OTP' });
  }
};



exports.create = async (req, res) => {
  try {
    const { title, description, start_time, end_time, location, student_ids } = req.body;
    const faculty_id = req.user.id;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start_time, and end_time are required' });
    }

    const [result] = await db.query(
      `INSERT INTO activities (title, description, faculty_id, start_time, end_time, location, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', NOW())`,
      [title, description, faculty_id, start_time, end_time, location]
    );

    const activityId = result.insertId;

    // Get relationship ID for 'activity-student'
    const [relType] = await db.query("SELECT id FROM master_relationship WHERE relationship = 'activity-student' AND status = '1'");
    const relationshipId = relType[0]?.id || 3;

    // Map students to activity
    if (student_ids && student_ids.length > 0) {
      for (const studentId of student_ids) {
        await db.query(
          `INSERT INTO master_relationship_mapping (relationship, user, relation_user, status) VALUES (?, ?, ?, '1')`,
          [relationshipId, activityId.toString(), studentId]
        );
      }
    }

    res.status(201).json({
      message: 'Activity created successfully',
      activityId: activityId
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const { date, status } = req.query;
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query = `
      SELECT a.*, u.name as faculty_name
      FROM activities a
      JOIN users u ON a.faculty_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userType === 'student') {
      // Students see only activities they are mapped to
      query += ` AND a.id IN (
        SELECT CAST(user AS UNSIGNED) FROM master_relationship_mapping 
        WHERE relation_user = ? AND relationship = (SELECT id FROM master_relationship WHERE relationship = 'activity-student' AND status = '1')
      )`;
      params.push(userId);
    } else if (userType === 'faculty') {
      query += ` AND a.faculty_id = ?`;
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

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const [activities] = await db.query(
      `SELECT a.*, u.name as faculty_name
       FROM activities a
       JOIN users u ON a.faculty_id = u.id
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

exports.generateStartOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [activities] = await db.query('SELECT faculty_id FROM activities WHERE id = ?', [id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    if (activities[0].faculty_id !== userId) {
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

exports.generateEndOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [activities] = await db.query('SELECT faculty_id FROM activities WHERE id = ?', [id]);
    if (activities.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    if (activities[0].faculty_id !== userId) {
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

exports.getEnrolledStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const [students] = await db.query(
      `SELECT u.id, u.name, u.email,
              ar.status as attendance_status, ar.start_marked_at, ar.end_marked_at
       FROM master_relationship_mapping mrm
       JOIN users u ON mrm.relation_user = u.id
       LEFT JOIN attendance_records ar ON ar.activity_id = ? AND ar.student_id = u.id
       WHERE mrm.user = ? AND mrm.relationship = (SELECT id FROM master_relationship WHERE relationship = 'activity-student' AND status = '1')
       ORDER BY u.name`,
      [id, id]
    );

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};