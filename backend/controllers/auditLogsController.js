const db = require("../config/db");
const { canUserViewAdminPanel } = require("../utils/adminPanelAccess");

/**
 * GET /api/audit-logs
 * Get audit logs (admin only)
 * Query params: entity_type, action, limit, offset, actor_id
 */
exports.getLogs = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can view audit logs" });
    }

    const { entity_type, action, actor_id, limit = 50, offset = 0 } = req.query;

    let query = "SELECT * FROM audit_logs WHERE 1=1";
    const params = [];

    if (entity_type) {
      query += " AND entity_type = ?";
      params.push(entity_type);
    }

    if (action) {
      query += " AND action = ?";
      params.push(action);
    }

    if (actor_id) {
      query += " AND actor_id = ?";
      params.push(actor_id);
    }

    // Get total count
    const countQu = query.replace("SELECT *", "SELECT COUNT(*) as count");
    const [countResult] = await db.query(countQu, params);
    const total = countResult[0].count;

    // Get paginated results
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await db.query(query, params);

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Get audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

/**
 * GET /api/audit-logs/:id
 * Get single audit log detail
 */
exports.getById = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can view audit logs" });
    }

    const [log] = await db.query(
      "SELECT * FROM audit_logs WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!log.length) {
      return res.status(404).json({ error: "Audit log not found" });
    }

    // Parse JSON fields if present
    const logEntry = log[0];
    if (logEntry.old_value) {
      try {
        logEntry.old_value = JSON.parse(logEntry.old_value);
      } catch {}
    }
    if (logEntry.new_value) {
      try {
        logEntry.new_value = JSON.parse(logEntry.new_value);
      } catch {}
    }

    res.json({ log: logEntry });
  } catch (error) {
    console.error("❌ Get audit log error:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
};

/**
 * GET /api/audit-logs/entity-types
 * Get list of entity types that have audit logs
 */
exports.getEntityTypes = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can view audit logs" });
    }

    const [types] = await db.query(
      "SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type",
    );

    res.json({ entity_types: types.map((t) => t.entity_type) });
  } catch (error) {
    console.error("❌ Get entity types error:", error);
    res.status(500).json({ error: "Failed to fetch entity types" });
  }
};

/**
 * GET /api/audit-logs/summary
 * Get audit logs summary (counts by entity type and action)
 */
exports.getSummary = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can view audit logs" });
    }

    const [byEntity] = await db.query(
      `SELECT entity_type, COUNT(*) as count 
       FROM audit_logs 
       GROUP BY entity_type 
       ORDER BY count DESC`,
    );

    const [byAction] = await db.query(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       GROUP BY action 
       ORDER BY count DESC`,
    );

    const [recent] = await db.query(
      `SELECT actor_name, action, entity_type, entity_name, created_at 
       FROM audit_logs 
       ORDER BY created_at DESC 
       LIMIT 10`,
    );

    res.json({
      summary: {
        by_entity_type: byEntity,
        by_action: byAction,
        recent_actions: recent,
      },
    });
  } catch (error) {
    console.error("❌ Get summary error:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};
