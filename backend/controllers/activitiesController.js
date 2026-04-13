const db = require("../config/db");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
  getActiveOTP,
} = require("../config/redis");

// ═══════════════════════════════════════════════════════════
// COURSE MANAGEMENT
// ═══════════════════════════════════════════════════════════

// CREATE COURSE (Admin only) - WITH TIME CONFLICT CHECK
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      assigned_faculty_id,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end,
      max_students,
    } = req.body;

    const created_by = req.user.id;

    if (
      !title ||
      !assigned_faculty_id ||
      !start_date ||
      !end_date ||
      !schedule_days ||
      !time_slot_start ||
      !time_slot_end
    ) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    // ✅ CHECK TIME CONFLICT FOR FACULTY
    const [conflicts] = await db.query(
      `SELECT c.title, c.schedule_days, c.time_slot_start, c.time_slot_end
       FROM courses c
       WHERE c.assigned_faculty_id = ?
         AND c.status = 'active'
         AND (
           (c.start_date <= ? AND c.end_date >= ?)
           OR (c.start_date <= ? AND c.end_date >= ?)
           OR (c.start_date >= ? AND c.end_date <= ?)
         )`,
      [
        assigned_faculty_id,
        end_date, start_date,
        start_date, end_date,
        start_date, end_date,
      ]
    );

    // Check if any conflicting course shares schedule days AND time overlap
    for (const conflict of conflicts) {
      const existingDays = conflict.schedule_days.split(",").map((d) => d.trim());
      const newDays = schedule_days.split(",").map((d) => d.trim());
      const sharedDays = existingDays.filter((d) => newDays.includes(d));

      if (sharedDays.length > 0) {
        // Check time overlap
        const existingStart = conflict.time_slot_start;
        const existingEnd = conflict.time_slot_end;
        const newStart = time_slot_start;
        const newEnd = time_slot_end;

        if (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        ) {
          return res.status(400).json({
            error: `Time conflict! Faculty already has "${conflict.title}" on ${sharedDays.join(", ")} at ${existingStart}-${existingEnd}`,
          });
        }
      }
    }

    // Create course
    const [result] = await db.query(
      `INSERT INTO courses 
       (title, description, created_by, assigned_faculty_id, start_date, end_date, 
        schedule_days, time_slot_start, time_slot_end, max_students, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        title,
        description,
        created_by,
        assigned_faculty_id,
        start_date,
        end_date,
        schedule_days,
        time_slot_start,
        time_slot_end,
        max_students || 60,
      ]
    );

    const courseId = result.insertId;

    // Send notification to faculty
    await db.query(
      `INSERT INTO notifications (user_id, type, reference_id, message, is_read)
       VALUES (?, 'COURSE_ASSIGNED', ?, ?, FALSE)`,
      [assigned_faculty_id, courseId, `You have been assigned to course: ${title}`]
    );

    // Auto-generate sessions
    await generateCourseSessions(
      courseId,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end
    );

    res.status(201).json({
      message: "Course created successfully",
      course_id: courseId,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

// Generate sessions for course
async function generateCourseSessions(
  courseId,
  startDate,
  endDate,
  scheduleDays,
  startTime,
  endTime
) {
  const days = scheduleDays.split(",").map((d) => d.trim());
  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    if (days.includes(dayName)) {
      const sessionDate = d.toISOString().split("T")[0];

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
      WHERE c.status = 'active'
    `;
    const params = [];

    if (userType === "faculty") {
      query += ` AND c.assigned_faculty_id = ?`;
      params.push(userId);
    } else if (userType === "student") {
      query += ` AND c.id IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)`;
      params.push(userId);
    }

    query += ` ORDER BY c.created_at DESC`;

    const [courses] = await db.query(query, params);
    res.json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

// GET COURSE BY ID
exports.getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const [courses] = await db.query(
      `SELECT c.*, 
              u.name as faculty_name,
              (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count
       FROM courses c
       LEFT JOIN users u ON c.assigned_faculty_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (courses.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(courses[0]);
  } catch (error) {
    console.error("Get course error:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
};

// ADD STUDENTS TO COURSE (Admin or Faculty)
exports.addStudentsToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { student_ids } = req.body;
    const enrolledBy = req.user.id;

    if (!student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({ error: "student_ids must be an array" });
    }

    let added = 0;
    for (const studentId of student_ids) {
      const [result] = await db.query(
        `INSERT IGNORE INTO course_enrollments (course_id, student_id, enrolled_by)
         VALUES (?, ?, ?)`,
        [courseId, studentId, enrolledBy]
      );
      if (result.affectedRows > 0) added++;
    }

    res.json({ message: `${added} students added to course` });
  } catch (error) {
    console.error("Add students error:", error);
    res.status(500).json({ error: "Failed to add students" });
  }
};

// GET COURSE STUDENTS
exports.getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;

    const [students] = await db.query(
      `SELECT u.id, u.name, u.email, ce.enrolled_at
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.name`,
      [courseId]
    );

    res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// GET COURSE SESSIONS
exports.getCourseSessions = async (req, res) => {
  try {
    const { courseId } = req.params;

    const [sessions] = await db.query(
      `SELECT * FROM course_sessions 
       WHERE course_id = ? 
       ORDER BY session_date DESC, start_time`,
      [courseId]
    );

    res.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET ALL SESSIONS (Calendar view)
exports.getAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { date } = req.query;

    let query = `
      SELECT cs.*, c.title as course_title, c.assigned_faculty_id, u.name as faculty_name
      FROM course_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN users u ON c.assigned_faculty_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND cs.session_date = ?`;
      params.push(date);
    }

    if (userType === "faculty") {
      query += ` AND c.assigned_faculty_id = ?`;
      params.push(userId);
    } else if (userType === "student") {
      query += ` AND c.id IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)`;
      params.push(userId);
    }

    query += ` ORDER BY cs.session_date, cs.start_time`;

    const [sessions] = await db.query(query, params);
    res.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// GET SESSION BY ID
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [sessions] = await db.query(
      `SELECT cs.*, c.title as course_title, c.assigned_faculty_id, u.name as faculty_name
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       LEFT JOIN users u ON c.assigned_faculty_id = u.id
       WHERE cs.id = ?`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get active OTP if exists
    const startOTP = await getActiveOTP(`session:${id}:start`);
    const endOTP = await getActiveOTP(`session:${id}:end`);

    res.json({
      ...sessions[0],
      active_start_otp: startOTP,
      active_end_otp: endOTP,
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
};

// GET SESSION STUDENTS
exports.getSessionStudents = async (req, res) => {
  try {
    const { id } = req.params;

    // Get course_id from session
    const [sessions] = await db.query(
      `SELECT course_id FROM course_sessions WHERE id = ?`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const courseId = sessions[0].course_id;

    // Get enrolled students with attendance status
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email,
              sa.status, sa.start_marked_at, sa.end_marked_at, sa.duration_minutes
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       LEFT JOIN session_attendance sa ON sa.session_id = ? AND sa.student_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.name`,
      [id, courseId]
    );

    res.json({ students });
  } catch (error) {
    console.error("Get session students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// ═══════════════════════════════════════════════════════════
// OTP GENERATION (Faculty only)
// ═══════════════════════════════════════════════════════════

// GENERATE START OTP
exports.generateStartOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const [sessions] = await db.query(
      `SELECT cs.*, c.assigned_faculty_id 
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.id = ?`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (sessions[0].assigned_faculty_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check if session is today
    const sessionDate = new Date(sessions[0].session_date);
    const today = new Date();
    if (sessionDate.toDateString() !== today.toDateString()) {
      return res.status(400).json({ error: "Can only generate OTP on session day" });
    }

    // Generate OTP
    const otp = generateOTP();
    const key = `session:${id}:start`;
    await storeOTP(key, otp, userId);

    // Update session status
    await db.query(
      `UPDATE course_sessions 
       SET start_otp = ?, otp_generated_at = NOW(), status = 'ongoing' 
       WHERE id = ?`,
      [otp, id]
    );

    res.json({
      otp,
      message: "Start OTP generated",
      expires_in_seconds: 10,
    });
  } catch (error) {
    console.error("Generate start OTP error:", error);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
};

// GENERATE END OTP
exports.generateEndOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [sessions] = await db.query(
      `SELECT cs.*, c.assigned_faculty_id 
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.id = ?`,
      [id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (sessions[0].assigned_faculty_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const otp = generateOTP();
    const key = `session:${id}:end`;
    await storeOTP(key, otp, userId);

    await db.query(
      `UPDATE course_sessions 
       SET end_otp = ?, status = 'completed' 
       WHERE id = ?`,
      [otp, id]
    );

    res.json({
      otp,
      message: "End OTP generated",
      expires_in_seconds: 10,
    });
  } catch (error) {
    console.error("Generate end OTP error:", error);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
};

// ═══════════════════════════════════════════════════════════
// UTILITY ENDPOINTS
// ═══════════════════════════════════════════════════════════

// GET FACULTY LIST (for admin dropdown)
exports.getFaculty = async (req, res) => {
  try {
    const [faculty] = await db.query(
      `SELECT id, name, email FROM users WHERE user_type = 'faculty' AND is_active = TRUE ORDER BY name`
    );
    res.json({ faculty });
  } catch (error) {
    console.error("Get faculty error:", error);
    res.status(500).json({ error: "Failed to fetch faculty" });
  }
};

// GET STUDENTS LIST (for adding to courses)
exports.getStudents = async (req, res) => {
  try {
    const [students] = await db.query(
      `SELECT id, name, email FROM users WHERE user_type = 'student' AND is_active = TRUE ORDER BY name`
    );
    res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// CHECK SCHEDULE CONFLICT
exports.checkScheduleConflict = async (req, res) => {
  try {
    const {
      faculty_id,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end,
    } = req.body;

    const [conflicts] = await db.query(
      `SELECT c.title, c.schedule_days, c.time_slot_start, c.time_slot_end
       FROM courses c
       WHERE c.assigned_faculty_id = ?
         AND c.status = 'active'
         AND (
           (c.start_date <= ? AND c.end_date >= ?)
           OR (c.start_date <= ? AND c.end_date >= ?)
           OR (c.start_date >= ? AND c.end_date <= ?)
         )`,
      [
        faculty_id,
        end_date, start_date,
        start_date, end_date,
        start_date, end_date,
      ]
    );

    const hasConflict = conflicts.some((conflict) => {
      const existingDays = conflict.schedule_days.split(",").map((d) => d.trim());
      const newDays = schedule_days.split(",").map((d) => d.trim());
      const sharedDays = existingDays.filter((d) => newDays.includes(d));

      if (sharedDays.length === 0) return false;

      const existingStart = conflict.time_slot_start;
      const existingEnd = conflict.time_slot_end;

      return (
        (time_slot_start >= existingStart && time_slot_start < existingEnd) ||
        (time_slot_end > existingStart && time_slot_end <= existingEnd) ||
        (time_slot_start <= existingStart && time_slot_end >= existingEnd)
      );
    });

    res.json({ has_conflict: hasConflict, conflicts });
  } catch (error) {
    console.error("Check conflict error:", error);
    res.status(500).json({ error: "Failed to check conflict" });
  }
};

module.exports = exports;