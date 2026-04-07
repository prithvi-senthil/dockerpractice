const db = require("../config/db");
const { generateOTP, storeOTP, verifyOTP } = require("../config/redis");

// ── COURSES ──────────────────────────────────────────────

// ADMIN: Create a new course
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      course_code,
      max_students,
      assigned_faculty_id,
      schedule_days,
      start_time,
      end_time,
    } = req.body;
    const adminId = req.user.id;

    if (!title || !course_code || !assigned_faculty_id) {
      return res.status(400).json({
        error: "title, course_code, and assigned_faculty_id are required",
      });
    }

    // Insert course
    const [result] = await db.query(
      `INSERT INTO courses (title, description, course_code, max_students, assigned_faculty_id, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        title,
        description || null,
        course_code,
        max_students || 50,
        assigned_faculty_id,
        adminId,
      ],
    );

    const courseId = result.insertId;

    // Generate course sessions if schedule provided
    if (schedule_days && start_time && end_time) {
      const startDate =
        req.body.start_date || new Date().toISOString().split("T")[0];
      const endDate =
        req.body.end_date ||
        new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
      await generateCourseSessions(
        courseId,
        startDate,
        endDate,
        schedule_days,
        start_time,
        end_time,
      );
    }

    res.status(201).json({
      message: "Course created successfully",
      course_id: courseId,
      title,
      course_code,
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
};

// Helper: Generate recurring course sessions
async function generateCourseSessions(
  courseId,
  startDate,
  endDate,
  scheduleDays,
  startTime,
  endTime,
) {
  const days = scheduleDays.split(",").map((d) => d.trim());
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    if (days.includes(dayName)) {
      const sessionDate = d.toISOString().split("T")[0];
      await db.query(
        `INSERT INTO course_sessions (course_id, session_date, start_time, end_time, status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        [courseId, sessionDate, startTime, endTime],
      );
    }
  }
}

// GET ALL COURSES (role-based)
exports.getCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query = `
      SELECT c.*, 
             u.name as faculty_name,
             u.email as faculty_email,
             (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count
      FROM courses c
      LEFT JOIN users u ON c.assigned_faculty_id = u.id
      WHERE 1=1
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
    res.json(courses);
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

// GET COURSE BY ID
exports.getCourseById = async (req, res) => {
  try {
    console.log("🔍 getCourseById called with id:", req.params.id);
    const { id } = req.params;
    const [courses] = await db.query(
      `SELECT c.*, u.name as faculty_name, u.email as faculty_email,
              (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count
       FROM courses c
       LEFT JOIN users u ON c.assigned_faculty_id = u.id
       WHERE c.id = ?`,
      [id],
    );
    if (courses.length === 0)
      return res.status(404).json({ error: "Course not found" });
    res.json(courses[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch course" });
  }
};

// GET ALL FACULTY (for course assignment)
exports.getFaculty = async (req, res) => {
  try {
    console.log("👥 getFaculty called");
    const [faculty] = await db.query(
      `SELECT id, name, email FROM users WHERE user_type = 'faculty' ORDER BY name ASC`,
    );
    res.json({ faculty });
  } catch (error) {
    console.error("Get faculty error:", error);
    res.status(500).json({ error: "Failed to fetch faculty" });
  }
};
// GET ALL STUDENTS
exports.getStudents = async (req, res) => {
  try {
    console.log("👨‍🎓 getStudents called");
    const [students] = await db.query(
      `SELECT id, name, email FROM users WHERE user_type = 'student' ORDER BY name ASC`,
    );
    res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};
// CHECK FOR SCHEDULE CONFLICTS
exports.checkScheduleConflict = async (req, res) => {
  try {
    const { courseId, dayOfWeek, startTime, endTime } = req.body;

    if (!dayOfWeek || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Day, start time, and end time are required" });
    }

    // Get all existing activities for this course
    const [activities] = await db.query(
      `SELECT id, day_of_week, start_time, end_time FROM activities WHERE course_id = ?`,
      [courseId],
    );

    // Check for conflicts with all activities in the course
    const conflicts = activities.filter((activity) => {
      // Only check if it's the same day
      if (activity.day_of_week !== dayOfWeek) return false;

      // Parse times
      const existingStart = parseInt(activity.start_time, 10);
      const existingEnd = parseInt(activity.end_time, 10);
      const newStart = parseInt(startTime, 10);
      const newEnd = parseInt(endTime, 10);

      // Check if time ranges overlap
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        hasConflict: true,
        conflicts: conflicts,
        message: `Schedule conflict found. This ${dayOfWeek} time slot overlaps with existing activities.`,
      });
    }

    res.json({
      hasConflict: false,
      message: "No schedule conflicts detected.",
    });
  } catch (error) {
    console.error("Check schedule conflict error:", error);
    res.status(500).json({ error: "Failed to check schedule conflicts" });
  }
};

// Add students to course (admin or faculty)
exports.addStudentsToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { student_ids } = req.body;
    const enrolledBy = req.user.id;

    if (
      !student_ids ||
      !Array.isArray(student_ids) ||
      student_ids.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "student_ids must be a non-empty array" });
    }

    let added = 0;
    for (const studentId of student_ids) {
      await db.query(
        `INSERT IGNORE INTO course_enrollments (course_id, student_id, enrolled_by, enrolled_at)
         VALUES (?, ?, ?, NOW())`,
        [courseId, studentId, enrolledBy],
      );
      added++;
    }

    res.json({ message: `${added} students added to course` });
  } catch (error) {
    console.error("Add students error:", error);
    res.status(500).json({ error: "Failed to add students" });
  }
};

// Get enrolled students for a course
exports.getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const [students] = await db.query(
      `SELECT u.id, u.name, u.email, ce.enrolled_at
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.name`,
      [courseId],
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// ── SESSIONS ─────────────────────────────────────────────

// GET SESSIONS for a course (filtered by date)
exports.getCourseSessions = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { date } = req.query;

    let query = `SELECT cs.* FROM course_sessions cs WHERE cs.course_id = ?`;
    const params = [courseId];

    if (date) {
      query += ` AND cs.session_date = ?`;
      params.push(date);
    }
    query += ` ORDER BY cs.session_date ASC, cs.start_time ASC`;

    const [sessions] = await db.query(query, params);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// GET ALL SESSIONS across courses (for calendar view, role-based)
exports.getAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { date } = req.query;

    let query = `
      SELECT cs.*, c.title as course_title, c.max_students,
             u.name as faculty_name, u.id as faculty_id,
             (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count
      FROM course_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN users u ON c.assigned_faculty_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (userType === "faculty") {
      query += ` AND c.assigned_faculty_id = ?`;
      params.push(userId);
    } else if (userType === "student") {
      query += ` AND c.id IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)`;
      params.push(userId);
    }

    if (date) {
      query += ` AND cs.session_date = ?`;
      params.push(date);
    }

    query += ` ORDER BY cs.session_date ASC, cs.start_time ASC`;

    const [sessions] = await db.query(query, params);
    res.json(sessions);
  } catch (error) {
    console.error("Get all sessions error:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// GET SESSION BY ID
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const [sessions] = await db.query(
      `SELECT cs.*, c.title as course_title, c.max_students, c.assigned_faculty_id,
              u.name as faculty_name
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       LEFT JOIN users u ON c.assigned_faculty_id = u.id
       WHERE cs.id = ?`,
      [id],
    );
    if (sessions.length === 0)
      return res.status(404).json({ error: "Session not found" });
    res.json(sessions[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
};

// Get students for a session with their attendance
exports.getSessionStudents = async (req, res) => {
  try {
    const { id } = req.params;

    // Get course_id from session
    const [sessions] = await db.query(
      `SELECT course_id FROM course_sessions WHERE id = ?`,
      [id],
    );
    if (sessions.length === 0)
      return res.status(404).json({ error: "Session not found" });

    const courseId = sessions[0].course_id;

    const [students] = await db.query(
      `SELECT u.id, u.name, u.email,
              sa.status as attendance_status,
              sa.start_marked_at, sa.end_marked_at, sa.duration_minutes
       FROM course_enrollments ce
       JOIN users u ON ce.student_id = u.id
       LEFT JOIN session_attendance sa ON sa.session_id = ? AND sa.student_id = u.id
       WHERE ce.course_id = ?
       ORDER BY u.name`,
      [id, courseId],
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session students" });
  }
};

// ── OTP GENERATION ───────────────────────────────────────────────────

// Faculty: Generate START OTP for a session
exports.generateStartOTP = async (req, res) => {
  try {
    const { id } = req.params; // session id
    const userId = req.user.id;

    const [sessions] = await db.query(
      `SELECT cs.*, c.assigned_faculty_id, c.title as course_title
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.id = ?`,
      [id],
    );

    if (sessions.length === 0)
      return res.status(404).json({ error: "Session not found" });
    const session = sessions[0];

    if (session.assigned_faculty_id !== userId) {
      return res.status(403).json({
        error: "Not authorized — you are not the faculty for this session",
      });
    }

    // Check if within session time window (allow 15 min early)
    const now = new Date();
    const sessionStart = new Date(
      `${session.session_date}T${session.start_time}`,
    );
    const sessionEnd = new Date(`${session.session_date}T${session.end_time}`);
    const earlyBuffer = new Date(sessionStart.getTime() - 15 * 60 * 1000);

    if (now < earlyBuffer || now > sessionEnd) {
      return res.status(400).json({
        error: `OTP can only be generated during session time (${session.start_time} - ${session.end_time})`,
      });
    }

    const otp = generateOTP();
    await storeOTP(`start:session:${id}`, otp, userId);

    await db.query(
      `UPDATE course_sessions SET start_otp = ?, otp_generated_at = NOW(), status = 'ongoing' WHERE id = ?`,
      [otp, id],
    );

    res.json({
      otp,
      message: "Start OTP generated successfully",
      expires_in_seconds: 300,
      session_title: session.course_title,
    });
  } catch (error) {
    console.error("Generate start OTP error:", error);
    res.status(500).json({ error: "Failed to generate OTP" });
  }
};

// Faculty: Generate END OTP for a session
exports.generateEndOTP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [sessions] = await db.query(
      `SELECT cs.*, c.assigned_faculty_id, c.title as course_title
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.id = ?`,
      [id],
    );

    if (sessions.length === 0)
      return res.status(404).json({ error: "Session not found" });
    const session = sessions[0];

    if (session.assigned_faculty_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (session.status !== "ongoing") {
      return res
        .status(400)
        .json({ error: "Session is not ongoing. Generate Start OTP first." });
    }

    const otp = generateOTP();
    await storeOTP(`end:session:${id}`, otp, userId);

    await db.query(
      `UPDATE course_sessions SET end_otp = ?, status = 'completed' WHERE id = ?`,
      [otp, id],
    );

    res.json({
      otp,
      message: "End OTP generated successfully",
      expires_in_seconds: 300,
    });
  } catch (error) {
    console.error("Generate end OTP error:", error);
    res.status(500).json({ error: "Failed to generate end OTP" });
  }
};
