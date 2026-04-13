const db = require("../config/db");

/**
 * Log an action to the audit_logs table
 * @param {number} userId - ID of user performing action
 * @param {string} action - Action type: CREATE, UPDATE, DELETE, VIEW
 * @param {string} entity_type - Entity type: INFRASTRUCTURE, SETTING, USER, PRIORITY_LEVEL, etc.
 * @param {number} entity_id - ID of the entity being modified
 * @param {string} entity_name - Human-readable name of entity
 * @param {object} old_value - Previous values (for UPDATE/DELETE)
 * @param {object} new_value - New values (for CREATE/UPDATE)
 * @param {string} description - Human-readable description
 */
async function auditLog(
  userId,
  action,
  entity_type,
  entity_id,
  entity_name,
  old_value = null,
  new_value = null,
  description = "",
) {
  try {
    const actor_name = await getUserName(userId);
    const actor_email = await getUserEmail(userId);

    await db.query(
      `INSERT INTO audit_logs 
       (actor_id, actor_name, actor_email, action, entity_type, entity_id, entity_name, 
        old_value, new_value, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        actor_name,
        actor_email,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        description,
      ],
    );

    console.log(
      `✅ Audit log: ${actor_name} - ${action} - ${entity_type}#${entity_id}`,
    );
  } catch (error) {
    console.error("❌ Audit log error:", error);
  }
}

async function getUserName(userId) {
  try {
    const [rows] = await db.query(
      "SELECT name FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    return rows[0]?.name || "System";
  } catch {
    return "System";
  }
}

async function getUserEmail(userId) {
  try {
    const [rows] = await db.query(
      "SELECT email FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    return rows[0]?.email || "system@app.internal";
  } catch {
    return "system@app.internal";
  }
}

module.exports = auditLog;
