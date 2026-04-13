const db = require("../config/db");

// HELPER: Update course status based on dates
async function updateCourseStatus(courseId) {
  try {
    const [courses] = await db.query(
      `SELECT start_date, end_date FROM courses WHERE id = ?`,
      [courseId],
    );

    if (courses.length === 0) return;

    const course = courses[0];
    const today = new Date();
    const startDate = new Date(course.start_date);
    const endDate = new Date(course.end_date);

    let newStatus = "active";
    if (today > endDate) {
      newStatus = "completed";
    } else if (today < startDate) {
      newStatus = "active";
    }

    await db.query(`UPDATE courses SET status = ? WHERE id = ?`, [
      newStatus,
      courseId,
    ]);
  } catch (error) {
    console.error("Update course status error:", error);
  }
}

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
      max_students,
    } = req.body;

    const created_by = req.user.id;

    if (
      !title ||
      !assigned_faculty_id ||
      !start_date ||
      !end_date ||
      !time_slot_start ||
      !time_slot_end
    ) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
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
      ],
    );

    const courseId = result.insertId;

    // Send notification to faculty
    await db.query(
      `INSERT INTO notifications (user_id, type, reference_id, message, is_read)
       VALUES (?, 'COURSE_ASSIGNED', ?, ?, FALSE)`,
      [
        assigned_faculty_id,
        courseId,
        `You have been assigned to course: ${title}`,
      ],
    );

    // Auto-generate sessions based on schedule_days
    await generateCourseSessions(
      courseId,
      start_date,
      end_date,
      schedule_days,
      time_slot_start,
      time_slot_end,
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
  endTime,
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
        [courseId, sessionDate, startTime, endTime],
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

    if (userType === "faculty") {
      query += ` AND c.assigned_faculty_id = ?`;
      params.push(userId);
    } else if (userType === "student") {
      query += ` AND c.id IN (SELECT course_id FROM course_enrollments WHERE student_id = ?)`;
      params.push(userId);
    }
    // Admin sees all

    query += ` ORDER BY c.created_at DESC`;

    const [courses] = await db.query(query, params);

    // Update status for each course based on current date
    for (const course of courses) {
      await updateCourseStatus(course.id);
    }

    // Fetch again with updated statuses
    const [updatedCourses] = await db.query(query, params);
    res.json({ courses: updatedCourses });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

// ADD STUDENTS TO COURSE (Admin only - after faculty accepts)
exports.addStudentsToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { student_ids } = req.body; // Array of student IDs
    const enrolledBy = req.user.id;

    if (!student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({ error: "student_ids must be an array" });
    }

    // Verify course exists and is accepted
    const [courses] = await db.query(
      `SELECT * FROM courses WHERE id = ? AND assignment_status = 'accepted'`,
      [courseId],
    );

    if (courses.length === 0) {
      return res.status(403).json({
        error:
          "Students can only be added after faculty accepts the course assignment",
      });
    }

    for (const studentId of student_ids) {
      await db.query(
        `INSERT IGNORE INTO course_enrollments (course_id, student_id, enrolled_by)
         VALUES (?, ?, ?)`,
        [courseId, studentId, enrolledBy],
      );
    }

    res.json({ message: `${student_ids.length} students added to course` });
  } catch (error) {
    console.error("Add students error:", error);
    res.status(500).json({ error: "Failed to add students" });
  }
};

// GET PENDING COURSES (Faculty only)
exports.getPendingCourses = async (req, res) => {
  try {
    const facultyId = req.user.id;

    const [courses] = await db.query(
      `SELECT c.*, 
              u.name as created_by_name,
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

// ACCEPT COURSE (Faculty only)
exports.acceptCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const facultyId = req.user.id;

    // Verify course exists and belongs to this faculty and is pending
    const [courses] = await db.query(
      `SELECT * FROM courses WHERE id = ? AND assigned_faculty_id = ? AND assignment_status = 'pending'`,
      [courseId, facultyId],
    );

    if (courses.length === 0) {
      return res.status(404).json({ error: "Course not found or not pending" });
    }

    const course = courses[0];

    // Update course status
    await db.query(
      `UPDATE courses SET assignment_status = 'accepted', accepted_at = NOW() WHERE id = ?`,
      [courseId],
    );

    // Generate course sessions now that faculty accepted
    await generateCourseSessions(
      courseId,
      course.start_date,
      course.end_date,
      course.schedule_days,
      course.time_slot_start,
      course.time_slot_end,
    );

    // Send notification to admin (created_by)
    const [adminResults] = await db.query(
      `SELECT created_by FROM courses WHERE id = ?`,
      [courseId],
    );
    const adminId = adminResults[0].created_by;

    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, course_id, reference_data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        adminId,
        "COURSE_ACCEPTED",
        `${course.title} - Accepted`,
        `Faculty ${req.user.name} accepted the course assignment for ${course.title}`,
        courseId,
        JSON.stringify({
          course_id: courseId,
          course_title: course.title,
          faculty_name: req.user.name,
          action: "accepted",
        }),
      ],
    );

    res.json({ message: "Course accepted successfully" });
  } catch (error) {
    console.error("Accept course error:", error);
    res.status(500).json({ error: "Failed to accept course" });
  }
};

// REJECT COURSE (Faculty only)
exports.rejectCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const facultyId = req.user.id;

    // Verify course exists and belongs to this faculty and is pending
    const [courses] = await db.query(
      `SELECT * FROM courses WHERE id = ? AND assigned_faculty_id = ? AND assignment_status = 'pending'`,
      [courseId, facultyId],
    );

    if (courses.length === 0) {
      return res.status(404).json({ error: "Course not found or not pending" });
    }

    const course = courses[0];

    // Update course status
    await db.query(
      `UPDATE courses SET assignment_status = 'rejected', rejected_at = NOW() WHERE id = ?`,
      [courseId],
    );

    // Send notification to admin (created_by)
    const [adminResults] = await db.query(
      `SELECT created_by FROM courses WHERE id = ?`,
      [courseId],
    );
    const adminId = adminResults[0].created_by;

    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, course_id, reference_data, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        adminId,
        "COURSE_REJECTED",
        `${course.title} - Rejected`,
        `Faculty ${req.user.name} rejected the course assignment for ${course.title}`,
        courseId,
        JSON.stringify({
          course_id: courseId,
          course_title: course.title,
          faculty_name: req.user.name,
          action: "rejected",
        }),
      ],
    );

    res.json({ message: "Course rejected successfully" });
  } catch (error) {
    console.error("Reject course error:", error);
    res.status(500).json({ error: "Failed to reject course" });
  }
};

// GET NOTIFICATIONS (Admin or Faculty)
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { is_read } = req.query; // Filter by read status (optional)

    let query = `
      SELECT n.*, c.title as course_title
      FROM notifications n
      LEFT JOIN courses c ON n.course_id = c.id
      WHERE n.user_id = ?
    `;
    const params = [userId];

    if (is_read !== undefined) {
      query += ` AND n.is_read = ?`;
      params.push(is_read === "true" ? 1 : 0);
    }

    query += ` ORDER BY n.created_at DESC`;

    const [notifications] = await db.query(query, params);
    res.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// MARK NOTIFICATION AS READ
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Verify notification belongs to user
    const [notif] = await db.query(
      `SELECT * FROM notifications WHERE id = ? AND user_id = ?`,
      [notificationId, userId],
    );

    if (notif.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await db.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [
      notificationId,
    ]);

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification error:", error);
    res.status(500).json({ error: "Failed to mark notification" });
  }
};

// GET UNREAD NOTIFICATION COUNT
exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId],
    );

    res.json({ unread_count: result[0].count });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
};

// DELETE ALL COURSES (Admin only)
exports.deleteAllCourses = async (req, res) => {
  try {
    const userType = req.user.user_type;

    if (userType !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can delete all courses" });
    }

    // Delete all courses (cascading deletes will handle related records)
    const [result] = await db.query("DELETE FROM courses");

    res.json({
      message: "All courses deleted successfully",
      deletedCount: result.affectedRows,
    });
  } catch (error) {
    console.error("Delete all courses error:", error);
    res.status(500).json({ error: "Failed to delete courses" });
  }
};

module.exports = exports;
