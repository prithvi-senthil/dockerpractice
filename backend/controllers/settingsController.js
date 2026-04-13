const db = require("../config/db");
const auditLog = require("../utils/auditLog");
const { canUserViewAdminPanel } = require("../utils/adminPanelAccess");

/**
 * GET /api/settings/otp-validity
 * Get OTP validity setting
 */
exports.getOtpValidity = async (req, res) => {
  try {
    const [setting] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'otp_validity_seconds' LIMIT 1",
    );

    const value = setting.length ? parseInt(setting[0].setting_value) : 300; // Default 5 minutes
    res.json({ setting_key: "otp_validity_seconds", value });
  } catch (error) {
    console.error("❌ Get OTP validity error:", error);
    res.status(500).json({ error: "Failed to fetch OTP setting" });
  }
};

/**
 * POST /api/settings/otp-validity
 * Update OTP validity setting (admin only)
 * Body: { value } - value in seconds (30-3600)
 */
exports.updateOtpValidity = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can update settings" });
    }

    const { value } = req.body;

    if (!value || parseInt(value) < 30 || parseInt(value) > 3600) {
      return res
        .status(400)
        .json({ error: "OTP validity must be between 30 and 3600 seconds" });
    }

    // Get current value
    const [current] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'otp_validity_seconds' LIMIT 1",
    );

    const old_value = current.length ? current[0].setting_value : null;

    // Update or insert
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, description)
       VALUES ('otp_validity_seconds', ?, 'OTP validity duration in seconds')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [value],
    );

    // Log the action
    await auditLog(
      req.user.id,
      "UPDATE",
      "SETTING",
      null,
      "otp_validity_seconds",
      { value: old_value },
      { value },
      `Updated OTP validity to ${value} seconds`,
    );

    res.json({
      message: "OTP validity updated successfully",
      setting_key: "otp_validity_seconds",
      value: parseInt(value),
    });
  } catch (error) {
    console.error("❌ Update OTP validity error:", error);
    res.status(500).json({ error: "Failed to update OTP setting" });
  }
};

/**
 * GET /api/settings/working-hours
 * Get working hours setting
 */
exports.getWorkingHours = async (req, res) => {
  try {
    const [setting] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'working_hours' LIMIT 1",
    );

    let working_hours = {
      start_time: "08:00",
      end_time: "17:00",
      enabled: true,
    };
    if (setting.length && setting[0].setting_value) {
      working_hours = JSON.parse(setting[0].setting_value);
    }

    res.json({ setting_key: "working_hours", value: working_hours });
  } catch (error) {
    console.error("❌ Get working hours error:", error);
    res.status(500).json({ error: "Failed to fetch working hours" });
  }
};

/**
 * POST /api/settings/working-hours
 * Update working hours setting (admin only)
 * Body: { start_time, end_time, enabled }
 */
exports.updateWorkingHours = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can update settings" });
    }

    const { start_time, end_time, enabled } = req.body;

    // Validate time format HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({ error: "Invalid time format. Use HH:MM" });
    }

    if (start_time >= end_time) {
      return res
        .status(400)
        .json({ error: "Start time must be before end time" });
    }

    // Get current value
    const [current] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'working_hours' LIMIT 1",
    );

    const old_value = current.length
      ? JSON.parse(current[0].setting_value)
      : null;
    const new_value = { start_time, end_time, enabled };

    // Update or insert
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, description)
       VALUES ('working_hours', ?, 'Working hours for attendance')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(new_value)],
    );

    // Log the action
    await auditLog(
      req.user.id,
      "UPDATE",
      "SETTING",
      null,
      "working_hours",
      old_value,
      new_value,
      `Updated working hours to ${start_time} - ${end_time}`,
    );

    res.json({
      message: "Working hours updated successfully",
      setting_key: "working_hours",
      value: new_value,
    });
  } catch (error) {
    console.error("❌ Update working hours error:", error);
    res.status(500).json({ error: "Failed to update working hours" });
  }
};

/**
 * GET /api/settings/admin-access
 * Get admin panel access list
 */
exports.getAdminAccess = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can view this" });
    }

    const [setting] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'admin_panel_view_user_ids' LIMIT 1",
    );

    let userIds = [];
    if (setting.length && setting[0].setting_value) {
      userIds = JSON.parse(setting[0].setting_value);
    }

    // Get user details
    const [users] = await db.query(
      `SELECT id, name, email, priority_level FROM users 
       WHERE id IN (${userIds.length ? userIds.map(() => "?").join(",") : "0"})
       ORDER BY name`,
      userIds.length ? userIds : [],
    );

    res.json({
      setting_key: "admin_panel_view_user_ids",
      allowed_users: users,
      user_ids: userIds,
    });
  } catch (error) {
    console.error("❌ Get admin access error:", error);
    res.status(500).json({ error: "Failed to fetch admin access" });
  }
};

/**
 * POST /api/settings/admin-access
 * Update admin panel access list
 * Body: { user_ids: [] }
 */
exports.updateAdminAccess = async (req, res) => {
  try {
    const hasAdminAccess = await canUserViewAdminPanel(
      req.user.id,
      req.user.priority_level,
    );
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can update settings" });
    }

    const { user_ids } = req.body;

    if (!Array.isArray(user_ids)) {
      return res.status(400).json({ error: "user_ids must be an array" });
    }

    // Get current value
    const [current] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'admin_panel_view_user_ids' LIMIT 1",
    );

    const old_value = current.length
      ? JSON.parse(current[0].setting_value)
      : [];

    // Update or insert
    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, description)
       VALUES ('admin_panel_view_user_ids', ?, 'User IDs allowed to view admin panel')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(user_ids)],
    );

    // Log the action
    await auditLog(
      req.user.id,
      "UPDATE",
      "SETTING",
      null,
      "admin_panel_view_user_ids",
      { user_ids: old_value },
      { user_ids },
      `Updated admin panel access for ${user_ids.length} users`,
    );

    res.json({
      message: "Admin access updated successfully",
      setting_key: "admin_panel_view_user_ids",
      user_ids,
    });
  } catch (error) {
    console.error("❌ Update admin access error:", error);
    res.status(500).json({ error: "Failed to update admin access" });
  }
};
