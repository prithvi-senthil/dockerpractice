const db = require("../config/db");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
  getActiveOTP,
} = require("../config/redis");

// ═══════════════════════════════════════════════════════════
// UTILITY: Convert TIME to minutes for numeric comparison
// ═══════════════════════════════════════════════════════════
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Check if two time ranges overlap
const doTimesOverlap = (start1, end1, start2, end2) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return s2 < e1 && e2 > s1; // ✅ Standard overlap formula
};

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
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
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
        end_date,
        start_date,
        start_date,
        end_date,
        start_date,
        end_date,
      ],
    );

    // Check if any conflicting course shares schedule days AND time overlap
    for (const conflict of conflicts) {
      const existingDays = conflict.schedule_days
        .split(",")
        .map((d) => d.trim());
      const newDays = schedule_days.split(",").map((d) => d.trim());
      const sharedDays = existingDays.filter((d) => newDays.includes(d));

      if (sharedDays.length > 0) {
        // ✅ Use numeric comparison for time overlap
        const hasTimeConflict = doTimesOverlap(
          conflict.time_slot_start,
          conflict.time_slot_end,
          time_slot_start,
          time_slot_end,
        );

        if (hasTimeConflict) {
          return res.status(400).json({
            error: `❌ Time conflict! Faculty already has "${conflict.title}" on ${sharedDays.join(", ")} from ${conflict.time_slot_start} to ${conflict.time_slot_end}. Choose a different time slot.`,
          });
        }
      }
    }

    // Generate unique course code (e.g., CS-20260420-001)
    const courseCode = `${title.substring(0, 2).toUpperCase()}-${start_date.replace(/-/g, "")}-${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, "0")}`;

    // Create course with 'pending' status for faculty acceptance
    const [result] = await db.query(
      `INSERT INTO courses 
       (title, description, course_code, created_by, assigned_faculty_id, start_date, end_date, 
        schedule_days, time_slot_start, time_slot_end, max_students, assignment_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'active')`,
      [
        title,
        description,
        courseCode,
        created_by,
        assigned_faculty_id,
        start_date,
        end_date,
        schedule_days,
        time_slot_start,
        time_slot_end,
        max_students || 60,
      ],
    );

    const courseId = result.insertId;

    // Send notification to faculty - asking for acceptance/rejection
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, course_id, is_read)
       VALUES (?, 'COURSE_PENDING_ACCEPTANCE', ?, ?, ?, 0)`,
      [
        assigned_faculty_id,
        `New Course Assignment: ${title}`,
        `📋 New course assignment: "${title}" waiting for your acceptance. Review and accept/reject in your pending courses.`,
        courseId,
      ],
    );

    // ⏳ DON'T auto-generate sessions yet - wait for faculty acceptance
    // Sessions will be generated only after faculty accepts

    res.status(201).json({
      message: "✅ Course created! Waiting for faculty acceptance.",
      course_id: courseId,
      status: "pending",
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
  endTime,
) {
  // Handle null schedule_days
  if (!scheduleDays) {
    return;
  }

  const days = scheduleDays.split(",").map((d) => d.trim());

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Correctly iterate through dates
  for (let d = new Date(start); d <= end; ) {
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    if (days.includes(dayName)) {
      const sessionDate = d.toISOString().split("T")[0];
      // Format time as HH:MM (VARCHAR(5) expects 5 chars)
      const formattedStartTime =
        typeof startTime === "string"
          ? startTime.substring(0, 5) // "HH:MM:SS" -> "HH:MM"
          : startTime;
      const formattedEndTime =
        typeof endTime === "string" ? endTime.substring(0, 5) : endTime;

      await db.query(
        `INSERT INTO course_sessions (course_id, session_date, start_time, end_time, status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        [courseId, sessionDate, formattedStartTime, formattedEndTime],
      );
    }
    // Increment date
    d.setDate(d.getDate() + 1);
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
      [id],
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
        [courseId, studentId, enrolledBy],
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
      [courseId],
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
      [courseId],
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
      [id],
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get active OTP if exists
    const startOTP = await getActiveOTP(`start:session:${id}`); // ✅ MATCH format
    const endOTP = await getActiveOTP(`end:session:${id}`); // ✅ MATCH format

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
      [id],
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
      [id, courseId],
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
      [id],
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
      return res
        .status(400)
        .json({ error: "Can only generate OTP on session day" });
    }

    // Generate OTP
    const otp = generateOTP();
    const key = `start:session:${id}`; // ✅ MATCH attendanceController format
    await storeOTP(key, otp, userId);

    // Update session status
    await db.query(
      `UPDATE course_sessions 
       SET start_otp = ?, otp_generated_at = NOW(), status = 'ongoing' 
       WHERE id = ?`,
      [otp, id],
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
      [id],
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (sessions[0].assigned_faculty_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const otp = generateOTP();
    const key = `end:session:${id}`; // ✅ MATCH attendanceController format
    await storeOTP(key, otp, userId);

    await db.query(
      `UPDATE course_sessions 
       SET end_otp = ?, status = 'completed' 
       WHERE id = ?`,
      [otp, id],
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
      `SELECT id, name, email FROM users WHERE user_type = 'faculty' AND is_active = TRUE ORDER BY name`,
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
      `SELECT id, name, email FROM users WHERE user_type = 'student' AND is_active = TRUE ORDER BY name`,
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
      course_title,
    } = req.body;

    const [conflicts] = await db.query(
      `SELECT c.id, c.title, c.schedule_days, c.time_slot_start, c.time_slot_end, c.start_date, c.end_date
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
        end_date,
        start_date,
        start_date,
        end_date,
        start_date,
        end_date,
      ],
    );

    // Filter conflicts by time overlap
    const actualConflicts = conflicts.filter((conflict) => {
      const existingDays = conflict.schedule_days
        .split(",")
        .map((d) => d.trim());
      const newDays = schedule_days.split(",").map((d) => d.trim());
      const sharedDays = existingDays.filter((d) => newDays.includes(d));

      if (sharedDays.length === 0) return false;

      // ✅ Use numeric comparison for time overlap
      return doTimesOverlap(
        conflict.time_slot_start,
        conflict.time_slot_end,
        time_slot_start,
        time_slot_end,
      );
    });

    const hasConflict = actualConflicts.length > 0;

    res.json({
      has_conflict: hasConflict,
      conflict_count: actualConflicts.length,
      conflicts: actualConflicts.map((c) => ({
        id: c.id,
        title: c.title,
        schedule_days: c.schedule_days,
        time_slot_start: c.time_slot_start,
        time_slot_end: c.time_slot_end,
        start_date: c.start_date,
        end_date: c.end_date,
      })),
      proposed_course: {
        title: course_title || "New Course",
        schedule_days,
        time_slot_start,
        time_slot_end,
        start_date,
        end_date,
      },
    });
  } catch (error) {
    console.error("Check conflict error:", error);
    res.status(500).json({ error: "Failed to check conflict" });
  }
};

// ═══════════════════════════════════════════════════════════
// COURSE ACCEPTANCE/REJECTION (Faculty)
// ═══════════════════════════════════════════════════════════

// Faculty ACCEPTS course assignment
exports.acceptCourse = async (req, res) => {
  try {
    const { courseId: id } = req.params;
    const facultyId = req.user.id;

    console.log(
      `🔍 Accept course attempt - Course ID: ${id}, Faculty ID: ${facultyId}, Faculty Name: ${req.user.name}`,
    );

    // Verify course exists and is assigned to this faculty
    const [courses] = await db.query(
      `SELECT * FROM courses WHERE id = ? AND assigned_faculty_id = ? AND assignment_status = 'pending'`,
      [id, facultyId],
    );

    console.log(
      `📊 Query result: ${courses.length} courses found matching criteria`,
    );

    if (courses.length === 0) {
      // Debug: Check what we actually have in DB
      const [allCourses] = await db.query(
        `SELECT id, assigned_faculty_id, assignment_status FROM courses WHERE id = ?`,
        [id],
      );
      console.log(
        `❌ Course not found with matching criteria. DB has:`,
        allCourses,
      );
      return res
        .status(404)
        .json({ error: "Course not found or already processed" });
    }

    const course = courses[0];

    // Update course assignment status to 'accepted'
    await db.query(
      `UPDATE courses SET assignment_status = 'accepted', accepted_at = NOW() WHERE id = ?`,
      [id],
    );

    // Generate sessions now that faculty accepted
    await generateCourseSessions(
      id,
      course.start_date,
      course.end_date,
      course.schedule_days,
      course.time_slot_start,
      course.time_slot_end,
    );

    // Notify admin that faculty accepted
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, course_id, reference_data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        course.created_by,
        "COURSE_ACCEPTED",
        `${course.title} - Accepted`,
        `✅ Faculty accepted course "${course.title}". Sessions auto-generated.`,
        id,
        JSON.stringify({
          course_id: id,
          course_title: course.title,
          action: "accepted",
        }),
      ],
    );

    res.json({
      message: "✅ Course accepted! Sessions generated automatically.",
      course_id: id,
      status: "active",
    });
  } catch (error) {
    console.error("Accept course error:", error);
    res.status(500).json({ error: "Failed to accept course" });
  }
};

// Faculty REJECTS course assignment
exports.rejectCourse = async (req, res) => {
  try {
    const { courseId: id } = req.params;
    const reason = req.body?.reason || "No reason provided";
    const facultyId = req.user.id;

    // Verify course exists and is assigned to this faculty
    const [courses] = await db.query(
      `SELECT * FROM courses WHERE id = ? AND assigned_faculty_id = ? AND assignment_status = 'pending'`,
      [id, facultyId],
    );

    if (courses.length === 0) {
      return res
        .status(404)
        .json({ error: "Course not found or already processed" });
    }

    const course = courses[0];

    // Set course assignment status to 'rejected' (keep assigned_faculty_id since it's NOT NULL)
    await db.query(
      `UPDATE courses SET assignment_status = 'rejected', rejected_at = NOW() WHERE id = ?`,
      [id],
    );

    // Notify admin that faculty rejected
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, course_id, reference_data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        course.created_by,
        "COURSE_REJECTED",
        `${course.title} - Rejected`,
        `❌ Faculty rejected course "${course.title}". Reason: ${reason || "No reason provided"}. Reassign to another faculty.`,
        id,
        JSON.stringify({
          course_id: id,
          course_title: course.title,
          reason: reason || "No reason provided",
          action: "rejected",
        }),
      ],
    );

    res.json({
      message: "✅ Course rejected. Admin notified for reassignment.",
      course_id: id,
      status: "inactive",
    });
  } catch (error) {
    console.error("Reject course error:", error);
    res.status(500).json({ error: "Failed to reject course" });
  }
};

// Get PENDING courses for faculty
exports.getPendingCourses = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const [courses] = await db.query(
      `SELECT c.*, 
              u.name as faculty_name,
              (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as enrolled_count
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.assigned_faculty_id = ? AND c.assignment_status = 'pending'
       ORDER BY c.created_at DESC`,
      [facultyId],
    );

    res.json({ courses });
  } catch (error) {
    console.error("Get pending courses error:", error);
    res.status(500).json({ error: "Failed to fetch pending courses" });
  }
};

// Get UNASSIGNED courses for admin (rejected courses)
exports.getUnassignedCourses = async (req, res) => {
  try {
    const [courses] = await db.query(
      `SELECT c.*, 
              u.name as created_by_name
       FROM courses c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.assigned_faculty_id IS NULL AND c.status = 'inactive'
       ORDER BY c.created_at DESC`,
    );

    res.json({
      unassigned_courses: courses,
      count: courses.length,
    });
  } catch (error) {
    console.error("Get unassigned courses error:", error);
    res.status(500).json({ error: "Failed to fetch unassigned courses" });
  }
};

module.exports = exports;
