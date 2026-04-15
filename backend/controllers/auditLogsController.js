const db = require("../config/db");

/**
 * GET /api/audit-logs
 * Returns paginated audit log entries.
 *
 * Query params (all optional):
 *   entity_type  – filter by type  (INFRASTRUCTURE | CATEGORY | SUBCATEGORY | USER_GROUP | SETTING | PRIORITY)
 *   action       – filter by action (CREATE | UPDATE | DELETE)
 *   actor_id     – filter by user who made the change
 *   entity_id    – filter by specific record id
 *   date_from    – ISO date string (inclusive)
 *   date_to      – ISO date string (inclusive)
 *   search       – free-text search in description / entity_name
 *   page         – default 1
 *   limit        – default 50, max 200
 */
exports.getLogs = async (req, res) => {
  try {
    const {
      entity_type,
      action,
      actor_id,
      entity_id,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const safeLimit = Math.min(parseInt(limit) || 50, 200);
    const offset = ((parseInt(page) || 1) - 1) * safeLimit;

    const conditions = [];
    const params = [];

    if (entity_type) {
      conditions.push("al.entity_type = ?");
      params.push(entity_type.toUpperCase());
    }
    if (action) {
      conditions.push("al.action = ?");
      params.push(action.toUpperCase());
    }
    if (actor_id) {
      conditions.push("al.actor_id = ?");
      params.push(parseInt(actor_id));
    }
    if (entity_id) {
      conditions.push("al.entity_id = ?");
      params.push(parseInt(entity_id));
    }

    if (date_from) {
      conditions.push("al.created_at >= ?");
      params.push(date_from);
    }
    if (date_to) {
      conditions.push("al.created_at <= DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(date_to);
    }
    if (search) {
      conditions.push("(al.description LIKE ? OR al.entity_name LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT
         al.id,
         al.action,
         al.entity_type,
         al.entity_id,
         al.entity_name,
         al.old_value,
         al.new_value,
         al.description,
         al.created_at,
         al.actor_id,
         u.name   AS actor_name,
         u.email  AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset],
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
      params,
    );

    res.json({
      logs: rows,
      pagination: {
        page: parseInt(page) || 1,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

/**
 * GET /api/audit-logs/entity-types
 * Returns the distinct entity_type values present in the logs (for filtering UI).
 */
exports.getEntityTypes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type`,
    );
    res.json({ entity_types: rows.map((r) => r.entity_type) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entity types" });
  }
};
