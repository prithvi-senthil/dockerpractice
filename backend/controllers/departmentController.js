const db = require("../config/db");
const auditLog = require("../utils/auditLog");

/**
 * DEPARTMENT MANAGEMENT
 * Admin and HOD can create and manage departments
 */

/**
 * GET /api/departments - Get all departments
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const [departments] = await db.query(
      `SELECT d.id, d.name, d.description, d.hod_id, d.is_active,
              u.name as hod_name, u.email as hod_email
       FROM departments d
       LEFT JOIN users u ON d.hod_id = u.id
       WHERE d.is_active = 1
       ORDER BY d.name`,
    );

    res.json({
      success: true,
      departments,
      total: departments.length,
    });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

/**
 * POST /api/departments - Create a new department (Admin and HOD)
 */
exports.createDepartment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, hod_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Department name is required" });
    }

    // Check if department already exists
    const [existing] = await db.query(
      `SELECT id FROM departments WHERE name = ?`,
      [name],
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ error: "Department with this name already exists" });
    }

    // Create department
    const [result] = await db.query(
      `INSERT INTO departments (name, description, hod_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [name, description || null, hod_id || null, userId],
    );

    // Log action
    await auditLog(
      userId,
      "CREATE",
      "DEPARTMENT",
      result.insertId,
      null,
      null,
      { name, hod_id },
      `Created department: ${name}`,
    );

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      departmentId: result.insertId,
      name,
    });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
};

/**
 * GET /api/departments/:id - Get specific department
 */
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [departments] = await db.query(
      `SELECT d.*, u.name as hod_name, u.email as hod_email
       FROM departments d
       LEFT JOIN users u ON d.hod_id = u.id
       WHERE d.id = ?`,
      [id],
    );

    if (!departments.length) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json({
      success: true,
      department: departments[0],
    });
  } catch (error) {
    console.error("Get department error:", error);
    res.status(500).json({ error: "Failed to fetch department" });
  }
};

/**
 * PUT /api/departments/:id - Update department (Admin only)
 */
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, hod_id, is_active } = req.body;

    // Verify department exists
    const [existing] = await db.query(
      `SELECT * FROM departments WHERE id = ?`,
      [id],
    );

    if (!existing.length) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Update department
    const updates = [];
    const values = [];

    if (name) {
      updates.push("name = ?");
      values.push(name);
    }
    if (description) {
      updates.push("description = ?");
      values.push(description);
    }
    if (hod_id !== undefined) {
      updates.push("hod_id = ?");
      values.push(hod_id);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    await db.query(
      `UPDATE departments SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );

    // Log action
    await auditLog(
      req.user.id,
      "UPDATE",
      "DEPARTMENT",
      id,
      null,
      null,
      { name, hod_id, is_active },
      `Updated department: ${name || existing[0].name}`,
    );

    res.json({
      success: true,
      message: "Department updated successfully",
    });
  } catch (error) {
    console.error("Update department error:", error);
    res.status(500).json({ error: "Failed to update department" });
  }
};

/**
 * DELETE /api/departments/:id - Delete department (Admin only)
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify department exists
    const [existing] = await db.query(
      `SELECT * FROM departments WHERE id = ?`,
      [id],
    );

    if (!existing.length) {
      return res.status(404).json({ error: "Department not found" });
    }

    const deptName = existing[0].name;

    // Clear department field for all users in this department
    await db.query(`UPDATE users SET department = NULL WHERE department = ?`, [
      deptName,
    ]);

    // Delete department
    await db.query(`DELETE FROM departments WHERE id = ?`, [id]);

    // Log action
    await auditLog(
      req.user.id,
      "DELETE",
      "DEPARTMENT",
      id,
      null,
      null,
      { name: deptName },
      `Deleted department: ${deptName} (cleared from ${deptName} users)`,
    );

    res.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error) {
    console.error("Delete department error:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
};
