const db = require("../config/db");
const auditLog = require("../utils/auditLog");

// GET /api/settings/otp-validity
exports.getOtpValidity = async (req, res) => {
  try {
    const [setting] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'otp_validity' LIMIT 1",
    );

    const value = setting.length ? parseInt(setting[0].setting_value) : 10;
    res.json({ setting_key: "otp_validity", value });
  } catch (error) {
    console.error("❌ Get OTP validity error:", error);
    res.status(500).json({ error: "Failed to fetch OTP setting" });
  }
};

// PUT /api/settings/otp-validity (Admin only)
exports.updateOtpValidity = async (req, res) => {
  try {
    const hasAdminAccess = req.user.user_type === "admin";
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can update settings" });
    }

    const { validity_seconds } = req.body;

    if (
      !validity_seconds ||
      parseInt(validity_seconds) < 5 ||
      parseInt(validity_seconds) > 300
    ) {
      return res
        .status(400)
        .json({ error: "OTP validity must be between 5 and 300 seconds" });
    }

    const [current] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'otp_validity' LIMIT 1",
    );

    const old_value = current.length ? current[0].setting_value : null;

    await db.query(
      `INSERT INTO system_settings (setting_key, setting_value, description)
       VALUES ('otp_validity', ?, 'OTP validity in seconds')
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [validity_seconds],
    );

    await auditLog(
      req.user.id,
      "UPDATE",
      "SETTING",
      null,
      "otp_validity",
      { validity_seconds: old_value },
      { validity_seconds },
      `Updated OTP validity to ${validity_seconds} seconds`,
    );

    res.json({
      message: "OTP validity updated successfully",
      setting_key: "otp_validity",
      value: parseInt(validity_seconds),
    });
  } catch (error) {
    console.error("❌ Update OTP validity error:", error);
    res.status(500).json({ error: "Failed to update OTP setting" });
  }
};

// GET /api/settings/working-hours
exports.getWorkingHours = async (req, res) => {
  try {
    const [settings] = await db.query(
      `SELECT setting_key, setting_value FROM system_settings 
       WHERE setting_key IN ('working_hours_start', 'working_hours_end', 'working_hours_enabled')`,
    );

    const result = {
      working_hours_start: "09:00",
      working_hours_end: "17:00",
      working_hours_enabled: true,
    };

    settings.forEach((s) => {
      if (s.setting_key === "working_hours_enabled") {
        // Explicitly handle both string and boolean values
        result[s.setting_key] =
          s.setting_value === "true" || s.setting_value === true;
      } else {
        result[s.setting_key] = s.setting_value;
      }
    });

    console.log("✅ Working hours response:", {
      working_hours_enabled: result.working_hours_enabled,
      type: typeof result.working_hours_enabled,
    });

    res.json({
      setting_key: "working_hours",
      working_hours_start: result.working_hours_start,
      working_hours_end: result.working_hours_end,
      working_hours_enabled: result.working_hours_enabled,
    });
  } catch (error) {
    console.error("❌ Get working hours error:", error);
    res.status(500).json({ error: "Failed to fetch working hours" });
  }
};

// PUT /api/settings/working-hours (Admin only)
exports.updateWorkingHours = async (req, res) => {
  try {
    const hasAdminAccess = req.user.user_type === "admin";
    if (!hasAdminAccess) {
      return res.status(403).json({ error: "Only admins can update settings" });
    }

    const { enabled, start_time, end_time } = req.body;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (start_time && !timeRegex.test(start_time)) {
      return res
        .status(400)
        .json({ error: "Invalid start_time format. Use HH:MM" });
    }
    if (end_time && !timeRegex.test(end_time)) {
      return res
        .status(400)
        .json({ error: "Invalid end_time format. Use HH:MM" });
    }

    // Validate that start time is before end time
    if (start_time && end_time && start_time >= end_time) {
      return res
        .status(400)
        .json({ error: "Start time must be before end time" });
    }

    // Get old values for audit log
    const [currentSettings] = await db.query(
      `SELECT setting_key, setting_value FROM system_settings 
       WHERE setting_key IN ('working_hours_enabled', 'working_hours_start', 'working_hours_end')`,
    );

    const oldValues = {
      enabled: true,
      start_time: "09:00",
      end_time: "17:00",
    };

    currentSettings.forEach((s) => {
      if (s.setting_key === "working_hours_enabled") {
        oldValues.enabled = s.setting_value === "true";
      } else if (s.setting_key === "working_hours_start") {
        oldValues.start_time = s.setting_value;
      } else if (s.setting_key === "working_hours_end") {
        oldValues.end_time = s.setting_value;
      }
    });

    // Update settings
    if (enabled !== undefined) {
      await db.query(
        `INSERT INTO system_settings (setting_key, setting_value, description)
         VALUES ('working_hours_enabled', ?, 'Whether working hours validation is enabled')
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [enabled ? "true" : "false"],
      );
    }

    if (start_time) {
      await db.query(
        `INSERT INTO system_settings (setting_key, setting_value, description)
         VALUES ('working_hours_start', ?, 'Working hours start time (HH:MM format)')
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [start_time],
      );
    }

    if (end_time) {
      await db.query(
        `INSERT INTO system_settings (setting_key, setting_value, description)
         VALUES ('working_hours_end', ?, 'Working hours end time (HH:MM format)')
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [end_time],
      );
    }

    await auditLog(
      req.user.id,
      "UPDATE",
      "SETTING",
      null,
      "working_hours",
      oldValues,
      { enabled, start_time, end_time },
      "Updated working hours settings",
    );

    res.json({
      message: "Working hours updated successfully",
      settings: {
        enabled: enabled !== undefined ? enabled : oldValues.enabled,
        start_time: start_time || oldValues.start_time,
        end_time: end_time || oldValues.end_time,
      },
    });
  } catch (error) {
    console.error("❌ Update working hours error:", error);
    res.status(500).json({ error: "Failed to update working hours" });
  }
};

module.exports = exports;
