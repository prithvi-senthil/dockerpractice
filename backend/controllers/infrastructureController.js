const db = require("../config/db");
const auditLog = require("../utils/auditLog");
const { canUserViewAdminPanel } = require("../utils/adminPanelAccess");

/**
 * GET /api/infrastructure/list
 * Get all infrastructure (rooms, labs, halls, etc.)
 */
exports.getList = async (req, res) => {
  try {
    const [infrastructure] = await db.query(
      `SELECT 
        i.id,
        i.name,
        i.subtype,
        i.capacity,
        i.location,
        i.is_active,
        i.created_at,
        i.updated_at
       FROM infrastructure i
       WHERE i.is_active = TRUE
       ORDER BY i.name ASC`,
    );

    res.json({ infrastructure });
  } catch (error) {
    console.error("❌ Get infrastructure list error:", error);
    res.status(500).json({ error: "Failed to fetch infrastructure" });
  }
};

/**
 * GET /api/infrastructure/:id
 * Get infrastructure by ID
 */
exports.getById = async (req, res) => {
  try {
    const [infrastructure] = await db.query(
      `SELECT * FROM infrastructure WHERE id = ? AND is_active = TRUE LIMIT 1`,
      [req.params.id],
    );

    if (!infrastructure.length) {
      return res.status(404).json({ error: "Infrastructure not found" });
    }

    res.json({ infrastructure: infrastructure[0] });
  } catch (error) {
    console.error("❌ Get infrastructure error:", error);
    res.status(500).json({ error: "Failed to fetch infrastructure" });
  }
};

/**
 * POST /api/infrastructure/create
 * Create new infrastructure (admin only)
 * Body: { name, subtype, capacity, location }
 */
exports.create = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res
        .status(403)
        .json({ error: "Only admins can create infrastructure" });
    }

    const { name, subtype, capacity, location } = req.body;

    if (!name || !subtype) {
      return res.status(400).json({ error: "Name and subtype are required" });
    }

    const [result] = await db.query(
      `INSERT INTO infrastructure (name, subtype, capacity, location, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [name.trim(), subtype, capacity || null, location || null],
    );

    const infraId = result.insertId;

    // Log the action
    await auditLog(
      req.user.id,
      "CREATE",
      "INFRASTRUCTURE",
      infraId,
      name,
      null,
      { name, subtype, capacity, location },
      `Created infrastructure: ${name}`,
    );

    res.status(201).json({
      message: "Infrastructure created successfully",
      infrastructure: { id: infraId, name, subtype },
    });
  } catch (error) {
    console.error("❌ Create infrastructure error:", error);
    res.status(500).json({ error: "Failed to create infrastructure" });
  }
};

/**
 * PUT /api/infrastructure/:id
 * Update infrastructure (admin only)
 */
exports.update = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res
        .status(403)
        .json({ error: "Only admins can update infrastructure" });
    }

    const { name, subtype, capacity, location, is_active } = req.body;
    const infraId = req.params.id;

    // Get current values
    const [current] = await db.query(
      "SELECT * FROM infrastructure WHERE id = ? LIMIT 1",
      [infraId],
    );

    if (!current.length) {
      return res.status(404).json({ error: "Infrastructure not found" });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (subtype !== undefined) {
      updates.push("subtype = ?");
      params.push(subtype);
    }
    if (capacity !== undefined) {
      updates.push("capacity = ?");
      params.push(capacity);
    }
    if (location !== undefined) {
      updates.push("location = ?");
      params.push(location);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active);
    }

    if (!updates.length) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    params.push(infraId);

    await db.query(
      `UPDATE infrastructure SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    // Log the action
    await auditLog(
      req.user.id,
      "UPDATE",
      "INFRASTRUCTURE",
      infraId,
      current[0].name,
      {
        name: current[0].name,
        subtype: current[0].subtype,
        capacity: current[0].capacity,
        location: current[0].location,
      },
      { name, subtype, capacity, location, is_active },
      `Updated infrastructure: ${current[0].name}`,
    );

    res.json({ message: "Infrastructure updated successfully" });
  } catch (error) {
    console.error("❌ Update infrastructure error:", error);
    res.status(500).json({ error: "Failed to update infrastructure" });
  }
};

/**
 * DELETE /api/infrastructure/:id
 * Delete infrastructure (admin only)
 */
exports.delete = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res
        .status(403)
        .json({ error: "Only admins can delete infrastructure" });
    }

    const infraId = req.params.id;

    const [infrastructure] = await db.query(
      "SELECT * FROM infrastructure WHERE id = ? LIMIT 1",
      [infraId],
    );

    if (!infrastructure.length) {
      return res.status(404).json({ error: "Infrastructure not found" });
    }

    // Soft delete
    await db.query("UPDATE infrastructure SET is_active = FALSE WHERE id = ?", [
      infraId,
    ]);

    // Log the action
    await auditLog(
      req.user.id,
      "DELETE",
      "INFRASTRUCTURE",
      infraId,
      infrastructure[0].name,
      infrastructure[0],
      null,
      `Deleted infrastructure: ${infrastructure[0].name}`,
    );

    res.json({
      message: "Infrastructure deleted successfully",
      id: infraId,
    });
  } catch (error) {
    console.error("❌ Delete infrastructure error:", error);
    res.status(500).json({ error: "Failed to delete infrastructure" });
  }
};

/**
 * POST /api/infrastructure/:infraId/check-conflict
 * Check for time conflicts in infrastructure booking
 * Body: { date, start_time, end_time }
 */
exports.checkTimeConflict = async (req, res) => {
  try {
    const { infraId } = req.params;
    const { date, start_time, end_time } = req.body;

    if (!date || !start_time || !end_time) {
      return res
        .status(400)
        .json({ error: "Date, start_time, and end_time are required" });
    }

    // Check for conflicting attendance records
    const [conflicts] = await db.query(
      `SELECT 
        a.id,
        a.date,
        a.check_in_time,
        a.check_out_time,
        u.name as user_name
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.infrastructure_id = ?
       AND a.date = ?
       AND a.check_in_time < ?
       AND a.check_out_time > ?
       ORDER BY a.check_in_time ASC`,
      [infraId, date, end_time, start_time],
    );

    res.json({
      available: conflicts.length === 0,
      conflictCount: conflicts.length,
      conflicts: conflicts,
    });
  } catch (error) {
    console.error("❌ Check conflict error:", error);
    res.status(500).json({ error: "Failed to check conflict" });
  }
};
