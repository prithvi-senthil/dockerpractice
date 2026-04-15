const db = require("../config/db");
const auditLog = require("../utils/auditLog");

// GET /api/infrastructure/list
exports.getList = async (req, res) => {
  try {
    const [infrastructure] = await db.query(
      `SELECT * FROM infrastructure WHERE is_active = TRUE ORDER BY name ASC`,
    );

    res.json({ infrastructure });
  } catch (error) {
    console.error("❌ Get infrastructure list error:", error);
    res.status(500).json({ error: "Failed to fetch infrastructure" });
  }
};

// GET /api/infrastructure/:id
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

// POST /api/infrastructure/create (Admin only)
exports.create = async (req, res) => {
  try {
    const hasAdminAccess = req.user.user_type === "admin";
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

// PUT /api/infrastructure/:id (Admin only)
exports.update = async (req, res) => {
  try {
    const hasAdminAccess = req.user.user_type === "admin";
    if (!hasAdminAccess) {
      return res
        .status(403)
        .json({ error: "Only admins can update infrastructure" });
    }

    const { name, subtype, capacity, location, is_active } = req.body;
    const infraId = req.params.id;

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

    await auditLog(
      req.user.id,
      "UPDATE",
      "INFRASTRUCTURE",
      infraId,
      current[0].name,
      { name: current[0].name, subtype: current[0].subtype },
      { name, subtype, capacity, location },
      `Updated infrastructure: ${current[0].name}`,
    );

    res.json({ message: "Infrastructure updated successfully" });
  } catch (error) {
    console.error("❌ Update infrastructure error:", error);
    res.status(500).json({ error: "Failed to update infrastructure" });
  }
};

// DELETE /api/infrastructure/:id (Admin only)
exports.delete = async (req, res) => {
  try {
    const hasAdminAccess = req.user.user_type === "admin";
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

    await db.query("UPDATE infrastructure SET is_active = FALSE WHERE id = ?", [
      infraId,
    ]);

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

    res.json({ message: "Infrastructure deleted successfully", id: infraId });
  } catch (error) {
    console.error("❌ Delete infrastructure error:", error);
    res.status(500).json({ error: "Failed to delete infrastructure" });
  }
};

// POST /api/infrastructure/:infraId/check-conflict (Admin only)
exports.checkTimeConflict = async (req, res) => {
  try {
    const hasAdminAccess = req.user.user_type === "admin";
    if (!hasAdminAccess) {
      return res
        .status(403)
        .json({ error: "Only admins can check time conflicts" });
    }

    const { infraId } = req.params;
    const { start_time, end_time, session_date } = req.body;

    if (!start_time || !end_time || !session_date) {
      return res
        .status(400)
        .json({ error: "start_time, end_time, and session_date are required" });
    }

    // Check if infrastructure exists
    const [infra] = await db.query(
      "SELECT * FROM infrastructure WHERE id = ? AND is_active = TRUE LIMIT 1",
      [infraId],
    );

    if (!infra.length) {
      return res.status(404).json({ error: "Infrastructure not found" });
    }

    // Check for time conflicts with existing sessions on the same date
    const [conflicts] = await db.query(
      `SELECT cs.*, c.title 
       FROM course_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.session_date = ?
         AND (
           (cs.start_time < ? AND cs.end_time > ?)
           OR (cs.start_time < ? AND cs.end_time > ?)
           OR (cs.start_time >= ? AND cs.end_time <= ?)
         )`,
      [
        session_date,
        end_time,
        start_time,
        end_time,
        start_time,
        start_time,
        end_time,
      ],
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Time conflict detected",
        conflicts: conflicts.map((c) => ({
          session_id: c.id,
          course: c.title,
          start_time: c.start_time,
          end_time: c.end_time,
        })),
      });
    }

    res.json({
      message: "No time conflicts detected",
      infrastructure: { id: infraId, name: infra[0].name },
      capacity: infra[0].capacity,
    });
  } catch (error) {
    console.error("❌ Check time conflict error:", error);
    res.status(500).json({ error: "Failed to check time conflicts" });
  }
};

module.exports = exports;
