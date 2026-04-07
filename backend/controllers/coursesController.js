const db = require('../config/db');

// CREATE COURSE (Admin only)
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      assigned_faculty_id,
      start_date,
      end_date,
      schedule_days, // "Monday,Wednesday,Friday"
      time_slot_start,
      time_slot_end,
      max_students
    } = req.body;

    const created_by = req.user.id;

    if (!title || !assigned_faculty_id || !start_date || !end_date || !time_slot_start || !time_slot_end) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Create course
    const [result] = await db.query(
      `INSERT INTO courses 
       (title, description, created_by, assigned_faculty_id, start_date, end_date, 
        schedule_days, time_slot_start, time_slot_end, max_students, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [title, description, created_by, assigned_faculty_id, start_date, end_date,
       schedule_days, time_slot_start, time_slot_end, max_students || 60]
    );

    const courseId = result.insertId;

    // Send notification to faculty
    await db.query(
      `INSERT INTO notifications (user_id, type, reference_id, message, is_read)
       VALUES (?, 'COURSE_ASSIGNED', ?, ?, FALSE)`,
      [assigned_faculty_id, courseId, `You have been assigned to course: ${title}`]
    );

    // Auto-generate sessions based on schedule_days
    await generateCourseSessions(courseId, start_date, end_date, schedule_days, time_slot_start, time_slot_end);

    res.status(201).json({
      message: 'Course created successfully',
      course_id: courseId
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

// Generate sessions for course
async function generateCourseSessions(courseId, startDate, endDate, scheduleDays, startTime, endTime) {
  const days = scheduleDays.split(',').map(d => d.trim());
  const dayMap = { 
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
    'Thursday': 4, 'Friday': 5, 'Saturday': 6 
  };

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (days.includes(dayName)) {
      const sessionDate = d.toISOString().split('T')[0];
      
      await db.query(
        `INSERT INTO course_sessions (course_id, session_date, start_time, end_time, status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        [courseId, sessionDate, startTime, endTime]
      );
    }
  }
}

// GET COURSES (Role-based)
exports.getCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query = `
      SELECT c.*, 
             u.name as faculty_name,
             (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.assigned_faculty_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userType === 'faculty') {
      query += ` AND c.assigned_faculty_id = ?`;
      params.push(userId);
    } else if (userType === 'student') {
      query += ` AND c.id IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)`;
      params.push(userId);
    }
    // Admin sees all

    query += ` ORDER BY c.created_at DESC`;

    const [courses] = await db.query(query, params);
    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// ADD STUDENTS TO COURSE (Admin or Faculty)
exports.addStudentsToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { student_ids } = req.body; // Array of student IDs
    const enrolledBy = req.user.id;

    if (!student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({ error: 'student_ids must be an array' });
    }

    for (const studentId of student_ids) {
      await db.query(
        `INSERT IGNORE INTO course_enrollments (course_id, student_id, enrolled_by)
         VALUES (?, ?, ?)`,
        [courseId, studentId, enrolledBy]
      );
    }

    res.json({ message: `${student_ids.length} students added to course` });
  } catch (error) {
    console.error('Add students error:', error);
    res.status(500).json({ error: 'Failed to add students' });
  }
};

module.exports = exports;