const db = require("../config/db");
const bcrypt = require("bcryptjs");
const {
  sendHODWelcomeEmail,
  sendFacultyWelcomeEmail,
  sendStudentWelcomeEmail,
} = require("../services/emailService");

/**
 * Generate random password with role included
 */
const generatePassword = (role = "", length = 12) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  // Add role to password if provided
  if (role) {
    password = role.charAt(0).toUpperCase() + role.slice(1); // Capitalize role (Hod, Faculty, Student)
  }

  // Add random characters
  const randomCharsNeeded = length - password.length;
  for (let i = 0; i < randomCharsNeeded; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};

/**
 * Log admin action to audit logs
 */
const logAdminAction = async (
  admin_id,
  action,
  entity_type,
  entity_id,
  description,
) => {
  try {
    const query = `
      INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, description, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    await db.query(query, [
      admin_id,
      action,
      entity_type,
      entity_id,
      description,
    ]);
  } catch (error) {
    console.error("[AUDIT LOG ERROR]", error);
  }
};

// ============================================================
// GENERIC USER CREATION
// ============================================================

/**
 * Create a user by role (admin endpoint)
 * Body: { name, email, user_type, department }
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, user_type, department } = req.body;

    // Validate required fields
    if (!name || !email || !user_type) {
      return res.status(400).json({
        error: "Missing required fields: name, email, user_type",
      });
    }

    // Check if email already exists
    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Generate random password
    const password = generatePassword(user_type);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user based on type
    if (user_type === "hod") {
      if (!department) {
        return res.status(400).json({
          error: "Department is required for HOD",
        });
      }

      const query =
        "INSERT INTO users (name, email, password, user_type, department, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
      const [result] = await db.query(query, [
        name,
        email,
        hashedPassword,
        user_type,
        department,
      ]);

      const userId = result.insertId;

      // Log admin action
      await logAdminAction(
        req.user.id,
        "CREATE",
        "user_hod",
        userId,
        `Created HOD: ${name}`,
      );

      res.status(201).json({
        success: true,
        message: "HOD created successfully",
        data: {
          id: userId,
          name,
          email,
          user_type: "hod",
          department,
          temporary_password: password,
        },
      });
    } else if (user_type === "faculty") {
      if (!department) {
        return res.status(400).json({
          error: "Department is required for Faculty",
        });
      }

      const query =
        "INSERT INTO users (name, email, password, user_type, department, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
      const [result] = await db.query(query, [
        name,
        email,
        hashedPassword,
        user_type,
        department,
      ]);

      const userId = result.insertId;

      // Log admin action
      await logAdminAction(
        req.user.id,
        "CREATE",
        "user_faculty",
        userId,
        `Created Faculty: ${name}`,
      );

      res.status(201).json({
        success: true,
        message: "Faculty created successfully",
        data: {
          id: userId,
          name,
          email,
          user_type: "faculty",
          department,
          temporary_password: password,
        },
      });
    } else if (user_type === "student") {
      const query =
        "INSERT INTO users (name, email, password, user_type, created_at) VALUES (?, ?, ?, ?, NOW())";
      const [result] = await db.query(query, [
        name,
        email,
        hashedPassword,
        user_type,
      ]);

      const userId = result.insertId;

      // Log admin action
      await logAdminAction(
        req.user.id,
        "CREATE",
        "user_student",
        userId,
        `Created Student: ${name}`,
      );

      res.status(201).json({
        success: true,
        message: "Student created successfully",
        data: {
          id: userId,
          name,
          email,
          user_type: "student",
          temporary_password: password,
        },
      });
    } else if (user_type === "admin") {
      return res.status(400).json({
        error: "Cannot create admin users through this endpoint",
      });
    } else {
      return res.status(400).json({
        error: "Invalid user_type. Must be: hod, faculty, or student",
      });
    }
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// HOD MANAGEMENT
// ============================================================

/**
 * Create a new HOD
 */
exports.createHOD = async (req, res) => {
  try {
    const { name, email, department } = req.body;
    const admin_id = req.user.id;

    // Validation
    if (!name || !email || !department) {
      return res
        .status(400)
        .json({ error: "Name, email, and department are required" });
    }

    // Check if email already exists
    const checkQuery = "SELECT id FROM users WHERE email = ?";
    const [existing] = await db.query(checkQuery, [email]);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Generate password
    const password = generatePassword("hod");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create HOD
    const insertQuery = `
      INSERT INTO users (name, email, password, user_type, department, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, NOW())
    `;

    const [result] = await db.query(insertQuery, [
      name,
      email,
      hashedPassword,
      "hod",
      department,
    ]);

    const hodId = result.insertId;

    // Send welcome email
    const emailResult = await sendHODWelcomeEmail(
      email,
      name,
      department,
      password,
    );

    // Log action
    await logAdminAction(
      admin_id,
      "CREATE",
      "USER",
      hodId,
      `Created HOD: ${name} (${department})`,
    );

    res.status(201).json({
      success: true,
      message: "HOD created successfully",
      hod: {
        id: hodId,
        name,
        email,
        department,
        user_type: "hod",
      },
      email_sent: emailResult.success,
      email_message: emailResult.success
        ? "Welcome email sent"
        : `Email failed: ${emailResult.error}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all HODs
 */
exports.getAllHODs = async (req, res) => {
  try {
    const query =
      'SELECT id, name, email, department, is_active, created_at FROM users WHERE user_type = "hod" ORDER BY name';

    const [results] = await db.query(query);

    res.json({
      success: true,
      count: results.length,
      hods: results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update HOD
 */
exports.updateHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, is_active } = req.body;
    const admin_id = req.user.id;

    // Check if email is already in use by another user
    if (email) {
      const [existingEmail] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, id],
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Build dynamic query
    let updateFields = [];
    let values = [];

    if (name) {
      updateFields.push("name = ?");
      values.push(name);
    }
    if (email) {
      updateFields.push("email = ?");
      values.push(email);
    }
    if (department) {
      updateFields.push("department = ?");
      values.push(department);
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push("updated_at = NOW()");
    values.push(id);

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? AND user_type = 'hod'`;

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "HOD not found" });
    }

    // Log action
    await logAdminAction(
      admin_id,
      "UPDATE",
      "USER",
      id,
      `Updated HOD: ${name || "unknown"}`,
    );

    res.json({
      success: true,
      message: "HOD updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete HOD
 */
exports.deleteHOD = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;

    // Check if HOD exists
    const checkQuery =
      'SELECT name FROM users WHERE id = ? AND user_type = "hod"';
    const [existing] = await db.query(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "HOD not found" });
    }

    const hod_name = existing[0].name;

    // Delete HOD
    const deleteQuery = 'DELETE FROM users WHERE id = ? AND user_type = "hod"';
    await db.query(deleteQuery, [id]);

    // Log action
    await logAdminAction(
      admin_id,
      "DELETE",
      "USER",
      id,
      `Deleted HOD: ${hod_name}`,
    );

    res.json({
      success: true,
      message: "HOD deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// FACULTY MANAGEMENT
// ============================================================

/**
 * Create Faculty (assigned to HOD)
 */
exports.createFaculty = async (req, res) => {
  try {
    const { name, email, report_to } = req.body;
    const admin_id = req.user.id;

    if (!name || !email || !report_to) {
      return res
        .status(400)
        .json({ error: "Name, email, and report_to (HOD) are required" });
    }

    // Check if email exists
    const checkQuery = "SELECT id FROM users WHERE email = ?";
    const [existing] = await db.query(checkQuery, [email]);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Check if HOD exists
    const hodQuery =
      'SELECT name, department FROM users WHERE id = ? AND user_type = "hod"';
    const [hodResults] = await db.query(hodQuery, [report_to]);

    if (hodResults.length === 0) {
      return res.status(404).json({ error: "HOD not found" });
    }

    const hod_name = hodResults[0].name;
    const department = hodResults[0].department;

    // Generate password
    const password = generatePassword("faculty");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Faculty
    const insertQuery = `
      INSERT INTO users (name, email, password, user_type, report_to, department, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    `;

    const [result] = await db.query(insertQuery, [
      name,
      email,
      hashedPassword,
      "faculty",
      report_to,
      department,
    ]);

    const facultyId = result.insertId;

    // Send welcome email
    const emailResult = await sendFacultyWelcomeEmail(
      email,
      name,
      password,
      hod_name,
    );

    // Log action
    await logAdminAction(
      admin_id,
      "CREATE",
      "USER",
      facultyId,
      `Created Faculty: ${name} under HOD: ${hod_name}`,
    );

    res.status(201).json({
      success: true,
      message: "Faculty created successfully",
      faculty: {
        id: facultyId,
        name,
        email,
        department,
        report_to,
        user_type: "faculty",
      },
      email_sent: emailResult.success,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all Faculty
 */
exports.getAllFaculty = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.department, u.report_to, u.is_active, u.created_at,
        hod.name as hod_name
      FROM users u
      LEFT JOIN users hod ON u.report_to = hod.id
      WHERE u.user_type = 'faculty'
      ORDER BY u.name
    `;

    const [results] = await db.query(query);

    res.json({
      success: true,
      count: results.length,
      faculty: results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update Faculty
 */
exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, report_to, is_active } = req.body;
    const admin_id = req.user.id;

    // Check if email is already in use by another user
    if (email) {
      const [existingEmail] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, id],
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    let updateFields = [];
    let values = [];

    if (name) {
      updateFields.push("name = ?");
      values.push(name);
    }
    if (email) {
      updateFields.push("email = ?");
      values.push(email);
    }
    if (report_to) {
      updateFields.push("report_to = ?");
      values.push(report_to);
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push("updated_at = NOW()");
    values.push(id);

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? AND user_type = 'faculty'`;

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    await logAdminAction(
      admin_id,
      "UPDATE",
      "USER",
      id,
      `Updated Faculty: ${name || "unknown"}`,
    );

    res.json({
      success: true,
      message: "Faculty updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete Faculty
 */
exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;

    const checkQuery =
      'SELECT name FROM users WHERE id = ? AND user_type = "faculty"';
    const [existing] = await db.query(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    const faculty_name = existing[0].name;

    const deleteQuery =
      'DELETE FROM users WHERE id = ? AND user_type = "faculty"';
    await db.query(deleteQuery, [id]);

    await logAdminAction(
      admin_id,
      "DELETE",
      "USER",
      id,
      `Deleted Faculty: ${faculty_name}`,
    );

    res.json({
      success: true,
      message: "Faculty deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// STUDENT MANAGEMENT
// ============================================================

/**
 * Create Student
 */
exports.createStudent = async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin_id = req.user.id;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    // Check if email exists
    const checkQuery = "SELECT id FROM users WHERE email = ?";
    const [existing] = await db.query(checkQuery, [email]);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }

    // Generate password
    const password = generatePassword("student");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Student
    const insertQuery = `
      INSERT INTO users (name, email, password, user_type, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, NOW())
    `;

    const [result] = await db.query(insertQuery, [
      name,
      email,
      hashedPassword,
      "student",
    ]);

    const studentId = result.insertId;

    // Send welcome email
    const emailResult = await sendStudentWelcomeEmail(email, name, password);

    // Log action
    await logAdminAction(
      admin_id,
      "CREATE",
      "USER",
      studentId,
      `Created Student: ${name}`,
    );

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      student: {
        id: studentId,
        name,
        email,
        user_type: "student",
      },
      email_sent: emailResult.success,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all Students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const query =
      'SELECT id, name, email, is_active, created_at FROM users WHERE user_type = "student" ORDER BY name';

    const [results] = await db.query(query);

    res.json({
      success: true,
      count: results.length,
      students: results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update Student
 */
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, is_active } = req.body;
    const admin_id = req.user.id;

    // Check if email is already in use by another user
    if (email) {
      const [existingEmail] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, id],
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    let updateFields = [];
    let values = [];

    if (name) {
      updateFields.push("name = ?");
      values.push(name);
    }
    if (email) {
      updateFields.push("email = ?");
      values.push(email);
    }
    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push("updated_at = NOW()");
    values.push(id);

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE id = ? AND user_type = 'student'`;

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    await logAdminAction(
      admin_id,
      "UPDATE",
      "USER",
      id,
      `Updated Student: ${name || "unknown"}`,
    );

    res.json({
      success: true,
      message: "Student updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete Student
 */
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;

    const checkQuery =
      'SELECT name FROM users WHERE id = ? AND user_type = "student"';
    const [existing] = await db.query(checkQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student_name = existing[0].name;

    const deleteQuery =
      'DELETE FROM users WHERE id = ? AND user_type = "student"';
    await db.query(deleteQuery, [id]);

    await logAdminAction(
      admin_id,
      "DELETE",
      "USER",
      id,
      `Deleted Student: ${student_name}`,
    );

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// ADMIN DASHBOARD STATS
// ============================================================

/**
 * Get all users with separation by role
 */
exports.getAllUsersByRole = async (req, res) => {
  try {
    const query = `
      SELECT 
        user_type,
        COUNT(*) as count,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id', id,
            'name', name,
            'email', email,
            'department', department,
            'is_active', is_active,
            'created_at', created_at
          )
        ) as users
      FROM users
      WHERE user_type != 'admin'
      GROUP BY user_type
      ORDER BY FIELD(user_type, 'hod', 'faculty', 'student')
    `;

    const [results] = await db.query(query);

    // Parse JSON
    const parsed = {};
    results.forEach((row) => {
      parsed[row.user_type] = {
        count: row.count,
        users: JSON.parse(`[${row.users}]`),
      };
    });

    res.json({
      success: true,
      summary: {
        total_hods: parsed.hod?.count || 0,
        total_faculty: parsed.faculty?.count || 0,
        total_students: parsed.student?.count || 0,
      },
      users_by_role: parsed,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
