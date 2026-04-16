/**
 * Admin Access Control Utilities
 * Check if user can access admin panel based on user_type
 */

import api from "../services/api";

/**
 * Check if user can access admin panel (async)
 * Only admin user_type can access admin panel
 * @param {Object} user - User object with user_type
 * @returns {Promise<Boolean>} Can user access admin panel
 */
export const canUserViewAdminPanel = async (user) => {
  if (!user) return false;

  // Only admin user_type has access to admin panel
  return user.user_type === "admin";
};

/**
 * Synchronous version - Check if user can access admin panel (without API call)
 * Only checks user_type
 * @param {Object} user - User object with user_type
 * @returns {Boolean} Can user access admin panel
 */
export const canUserViewAdminPanelSync = (user) => {
  if (!user) return false;

  // Only admin user_type has access to admin panel
  return user.user_type === "admin";
};

/**
 * Get user's role badge
 * @param {String} userType - User type (admin, faculty, student)
 * @returns {Object} Badge object with label, color, and textColor
 */
export const getRoleBadge = (userType) => {
  const badges = {
    admin: { label: "Admin", color: "#EF4444", textColor: "#fff" },
    faculty: { label: "Faculty", color: "#F59E0B", textColor: "#fff" },
    student: { label: "Student", color: "#10B981", textColor: "#fff" },
  };
  return badges[userType] || badges["student"];
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
  canUserViewAdminPanelSync,
  getRoleBadge,
  hasDefaultAdminAccess,
};
