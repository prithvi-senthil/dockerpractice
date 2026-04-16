const db = require("../config/db");

/**
 * Check if a user has admin panel access.
 * Admin panel access requires:
 * 1. User type is 'admin' OR
 * 2. User has a priority level that grants admin access
 */
const canUserViewAdminPanel = async (userId, priorityLevel) => {
  if (!userId) return false;

  try {
    // Check if user is admin type or has appropriate priority level
    const [rows] = await db.query(
      `SELECT user_type, priority_level FROM users WHERE id = ?`,
      [userId],
    );

    if (!rows || rows.length === 0) return false;

    const user = rows[0];

    // Grant access to admins
    if (user.user_type === "admin") return true;

    // Grant access based on priority level (typically 1 = highest privilege)
    if (user.priority_level && user.priority_level <= 2) return true;

    return false;
  } catch (error) {
    console.error("Error checking admin panel access:", error);
    return false;
  }
};

module.exports = { canUserViewAdminPanel };
