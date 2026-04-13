/**
 * Admin Access Control Utilities
 * Check if user has admin panel access based on priority level
 */

import api from "../services/api";

/**
 * Check if user can access admin panel (async)
 * Priority 1 (Admin) always has access
 * Priority 2 (Manager) and 3 (User) must be in admin_panel_view_user_ids setting
 * @param {Object} user - User object with id and priority_level
 * @returns {Promise<Boolean>} Can user access admin panel
 */
export const canUserViewAdminPanel = async (user) => {
  if (!user) return false;

  // Priority 1 (Admin) always has access
  if (user.priority_level === 1) {
    return true;
  }

  try {
    // Fetch admin access settings
    const response = await api.get("/settings/admin-access");
    const adminUserIds = response.data.user_ids || [];

    // Check if user is in admin access list
    return adminUserIds.includes(user.id);
  } catch (error) {
    console.error("❌ Error checking admin access:", error);
    return false;
  }
};

/**
 * Synchronous version - Check if user can access admin panel (without API call)
 * Only checks priority level, not admin_panel_view_user_ids setting
 * @param {Object} user - User object with id and priority_level
 * @param {Array} adminUserIds - Array of user IDs with admin panel access
 * @returns {Boolean} Can user access admin panel
 */
export const canUserViewAdminPanelSync = (user, adminUserIds = []) => {
  if (!user) return false;

  // Priority 1 (Admin) always has access
  if (user.priority_level === 1) {
    return true;
  }

  // Check if user is in admin access list
  return adminUserIds.includes(user.id);
};

/**
 * Get user's priority badge
 * @param {Number} priorityLevel - User's priority level (1, 2, or 3)
 * @returns {Object} Badge object with label, color, and text
 */
export const getPriorityBadge = (priorityLevel) => {
  const badges = {
    1: { label: "Admin", color: "#EF4444", textColor: "#fff" },
    2: { label: "Manager", color: "#F59E0B", textColor: "#fff" },
    3: { label: "User", color: "#10B981", textColor: "#fff" },
  };
  return badges[priorityLevel] || badges[3];
};

/**
 * Check if user type has default admin access
 * @param {String} userType - User type (admin, faculty, student)
 * @returns {Boolean} Does user type have admin access by default
 */
export const hasDefaultAdminAccess = (userType) => {
  return userType === "admin";
};

export default {
  canUserViewAdminPanel,
  getPriorityBadge,
  hasDefaultAdminAccess,
};
