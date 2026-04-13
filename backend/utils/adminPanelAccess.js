const db = require("../config/db");

/**
 * Check if user can view admin panel
 * Priority Level 1 (Admin) always has access
 * Other users must be explicitly added to admin_panel_view_user_ids setting
 */
async function canUserViewAdminPanel(userId, priorityLevel) {
  try {
    // Priority Level 1 always has admin access
    if (parseInt(priorityLevel) === 1) {
      return true;
    }

    // Check if user is explicitly allowed in settings
    const [settings] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'admin_panel_view_user_ids' LIMIT 1",
    );

    if (!settings.length) return false;

    try {
      const allowedUserIds = JSON.parse(settings[0].setting_value || "[]");
      return allowedUserIds.includes(parseInt(userId));
    } catch {
      return false;
    }
  } catch (error) {
    console.error("❌ canUserViewAdminPanel error:", error);
    return false;
  }
}

/**
 * Middleware to check admin panel access
 */
const requireAdminPanel = async (req, res, next) => {
  try {
    const hasAccess = await canUserViewAdminPanel(
      req.user?.id,
      req.user?.priority_level,
    );
    if (!hasAccess) {
      return res.status(403).json({ error: "Admin panel access denied" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Access check failed" });
  }
};

module.exports = {
  canUserViewAdminPanel,
  requireAdminPanel,
};
