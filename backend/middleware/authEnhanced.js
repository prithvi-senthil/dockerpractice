const db = require("../config/db");
const { ROLES, hasPermission, canApprove } = require("../config/roles");

/**
 * Enhanced role-based access control middleware
 * Uses the RBAC permission system defined in config/roles.js
 */

/**
 * Check if user has required permission
 * Replaces simple roleCheck - more granular permission checking
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "AUTHENTICATION_REQUIRED",
          message: "You must be logged in to access this resource",
        });
      }

      if (!hasPermission(requiredPermission, req.user.user_type)) {
        console.warn(
          `🚫 Permission denied: User ${req.user.id} (${req.user.user_type}) ` +
            `attempted '${requiredPermission}' at ${req.method} ${req.path}`,
        );
        return res.status(403).json({
          error: "ACCESS_DENIED",
          message: `You do not have permission to '${requiredPermission}'`,
          required_permission: requiredPermission,
          your_role: req.user.user_type,
        });
      }

      console.log(
        `✅ Access granted: User ${req.user.id} (${req.user.user_type}) ` +
          `permission '${requiredPermission}' → ${req.method} ${req.path}`,
      );
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Error checking permissions" });
    }
  };
};

/**
 * Legacy middleware - check if user has one of specified roles
 * Kept for backward compatibility with existing routes
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: "AUTHENTICATION_REQUIRED",
          message: "You must be logged in",
        });
      }

      if (!allowedRoles.includes(req.user.user_type)) {
        console.warn(
          `🚫 Access denied: User ${req.user.id} (${req.user.user_type}) ` +
            `required roles: ${allowedRoles.join(", ")}`,
        );
        return res.status(403).json({
          error: "ACCESS_DENIED",
          message: "You do not have the required role",
          required_roles: allowedRoles,
          your_role: req.user.user_type,
        });
      }

      console.log(
        `✅ Access granted: User ${req.user.id} (${req.user.user_type}) → ${req.method} ${req.path}`,
      );
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ error: "Error checking role" });
    }
  };
};

/**
 * Check if current user can approve a leave request
 * Hierarchical approval: Admin > HOD > Faculty > Student (cannot approve)
 */
const canApproveRequest = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.user_type;
    const leaveId = req.params.id;

    // Get leave request details including requestor
    const [leave] = await db.query(
      `SELECT lr.id, lr.user_id, u.name, u.user_type, u.report_to
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE lr.id = ?`,
      [leaveId],
    );

    if (!leave.length) {
      return res.status(404).json({
        error: "LEAVE_NOT_FOUND",
        message: "Leave request not found",
      });
    }

    const requestorId = leave[0].user_id;
    const requestorName = leave[0].name;

    // Check permission using role system
    const hasApprovalPermission = await canApprove(
      currentUserRole,
      requestorId,
      currentUserId,
      db,
    );

    if (!hasApprovalPermission) {
      console.warn(
        `🚫 Unauthorized: ${currentUserRole} (ID: ${currentUserId}) ` +
          `cannot approve leave #${leaveId} for user ${requestorId}`,
      );
      return res.status(403).json({
        error: "UNAUTHORIZED",
        message: "You are not authorized to approve this leave request",
        leave_id: leaveId,
        requestor: requestorName,
      });
    }

    // Attach leave details to request for downstream use
    req.leaveRequest = leave[0];
    console.log(
      `✅ Approval permission granted: ${currentUserRole} (${currentUserId}) → ` +
        `approve leave #${leaveId} for ${requestorName}`,
    );
    next();
  } catch (error) {
    console.error("Approval permission check error:", error);
    res.status(500).json({
      error: "PERMISSION_CHECK_FAILED",
      message: "Error checking approval permission",
    });
  }
};

/**
 * Check if current user can access data from target user
 * Used for: viewing profiles, attendance, grades, etc.
 * Rules:
 * - Admin can access anyone's data
 * - HOD can access faculty and students in their department
 * - Faculty can access their students
 * - Student can access only their own data
 */
const canAccessUserData = (targetUserId, targetUserRole) => {
  return async (req, res, next) => {
    try {
      const currentUserId = req.user.id;
      const currentUserRole = req.user.user_type;

      // Admin can access anyone
      if (currentUserRole === ROLES.ADMIN) {
        next();
        return;
      }

      // Can access own data
      if (currentUserId === targetUserId) {
        next();
        return;
      }

      // HOD can access faculty and students in their department
      if (currentUserRole === ROLES.HOD) {
        const [target] = await db.query(
          `SELECT report_to FROM users WHERE id = ?`,
          [targetUserId],
        );

        if (target.length > 0 && target[0].report_to === currentUserId) {
          next();
          return;
        }

        return res.status(403).json({
          error: "ACCESS_DENIED",
          message: "User is not in your department",
        });
      }

      // Faculty can access their students
      if (currentUserRole === ROLES.FACULTY) {
        const [enrollment] = await db.query(
          `SELECT ae.id FROM activity_enrollments ae
           JOIN activities a ON ae.activity_id = a.id
           WHERE ae.student_id = ? AND a.owner_id = ?
           LIMIT 1`,
          [targetUserId, currentUserId],
        );

        if (enrollment.length > 0) {
          next();
          return;
        }

        return res.status(403).json({
          error: "ACCESS_DENIED",
          message: "Student is not in your activities",
        });
      }

      // Students cannot access other students' data
      return res.status(403).json({
        error: "ACCESS_DENIED",
        message: "You cannot access other users data",
      });
    } catch (error) {
      console.error("Data access check error:", error);
      res.status(500).json({
        error: "ACCESS_CHECK_FAILED",
        message: "Error checking data access",
      });
    }
  };
};

/**
 * Ensure HOD can only see their department's data
 * Frequently used to enforce department isolation
 */
const enforceDepartmentIsolation = async (req, res, next) => {
  try {
    if (req.user.user_type === ROLES.ADMIN) {
      // Admin sees everything - set flag for use in controllers
      req.isDepartmentFiltered = false;
      next();
      return;
    }

    if (req.user.user_type === ROLES.HOD) {
      // HOD sees only their department
      req.isDepartmentFiltered = true;
      req.hodId = req.user.id;
      next();
      return;
    }

    // Other roles don't use department filtering
    req.isDepartmentFiltered = false;
    next();
  } catch (error) {
    console.error("Department isolation error:", error);
    res.status(500).json({ error: "Error applying filters" });
  }
};

module.exports = {
  checkPermission,
  requireRole,
  canApproveRequest,
  canAccessUserData,
  enforceDepartmentIsolation,
  ROLES,
};
