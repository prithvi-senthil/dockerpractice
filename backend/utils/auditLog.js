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
    await db.query(
      `INSERT INTO audit_logs 
       (actor_id, action, entity_type, entity_id, entity_name, 
        old_value, new_value, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
        description,
      ],
    );

    console.log(`✅ Audit log: ${action} - ${entity_type}#${entity_id}`);
  } catch (error) {
    console.error("❌ Audit log error:", error);
  }
}
module.exports = auditLog;
