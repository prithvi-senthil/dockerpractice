const db = require("./db");

/**
 * ROLE HIERARCHY for Attendance App
 * admin > hod > faculty > student
 */
const ROLES = {
  ADMIN: "admin",
  HOD: "hod",
  FACULTY: "faculty",
  STUDENT: "student",
};

/**
 * PERMISSION MATRIX - STRONGER RBAC FOR ATTENDANCE APP
 * Defines who can do what across different domains
 *
 * ROLE HIERARCHY: admin > hod > faculty > student
 */
const PERMISSIONS = {
  // ==========================================
  // COURSE MANAGEMENT
  // ==========================================
  // HOD/Admin create courses (pending approval for HOD)
  "course.create": ["hod", "admin"],

  // Only HOD/Admin assign faculty to courses
  "course.assign.faculty": ["hod", "admin"],

  // HOD views only THEIR courses, Admin views ALL
  "course.view.own": ["hod", "faculty", "admin"],
  "course.view.all": ["admin"],
  "course.view.department": ["hod", "admin"],

  // ONLY ADMIN can approve/reject courses
  "course.approve": ["admin"],
  "course.reject": ["admin"],

  // ONLY ADMIN assigns students directly
  "course.assign.students": ["admin"],

  // ==========================================
  // ATTENDANCE MARKING
  // ==========================================
  // ONLY STUDENTS mark attendance
  "attendance.mark": ["student"],
  "attendance.mark.start": ["student"],
  "attendance.mark.end": ["student"],

  // Students view own records, Faculty/Admin view activity reports
  "attendance.view.own": ["student"],
  "attendance.view.activity": ["faculty", "admin"],
  "attendance.view.department": ["hod", "admin"],
  "attendance.view.all": ["admin"],

  // ==========================================
  // ATTENDANCE PERCENTAGE/STATISTICS
  // ==========================================
  // Students view only their own percentage
  "attendance.percentage": ["student"],

  // Faculty/HOD/Admin view reports
  "attendance.report": ["faculty", "hod", "admin"],

  // ==========================================
  // LEAVE MANAGEMENT
  // ==========================================
  // Students and Faculty request leaves
  "leave.request": ["student", "faculty"],

  // STRICT: Only specific people can approve
  // Faculty → approve student leaves
  // HOD → approve faculty leaves
  // Admin → approve anyone
  "leave.approve": ["faculty", "hod", "admin"],

  // Students/Faculty view own leaves
  "leave.view.own": ["student", "faculty"],

  // HOD views faculty leaves, Admin views all
  "leave.view.team": ["hod", "admin"],
  "leave.view.all": ["admin"],

  // Only students view their leave percentage
  "leave.percentage": ["student"],

  // ==========================================
  // FACULTY MANAGEMENT (HOD FEATURE)
  // ==========================================
  // HOD manages their faculty, Admin sees all
  "faculty.view.department": ["hod", "admin"],
  "faculty.manage.department": ["hod", "admin"],
  "faculty.view.all": ["admin"],

  // ==========================================
  // ADMIN-ONLY FEATURES
  // ==========================================
  // Only admin manages audit logs
  "audit.view.all": ["admin"],
  "audit.view.own": ["hod"],

  // Only admin manages users
  "users.manage": ["admin"],

  // Reports available to faculty, hod, admin
  "reports.view": ["faculty", "hod", "admin"],
  "reports.view.all": ["admin"],

  // ==========================================
  // STUDENT RESTRICTIONS (WHAT THEY CANNOT DO)
  // ==========================================
  // Students CANNOT:
  // - Create activities/courses (no permission defined)
  // - Approve anything (no approval permissions listed)
  // - Manage faculty (no faculty permissions)
  // - View other students' data (view requires ownership check in controller)
  // - Access audit logs (no audit permission)
};

/**
 * Check if a user has a specific permission
 * @param {string} permission - Permission to check (e.g., 'activities.create')
 * @param {string} userRole - User's role (admin|hod|faculty|student)
 * @returns {boolean}
 */
const hasPermission = (permission, userRole) => {
  if (userRole === ROLES.ADMIN) {
    return true; // Admin has all permissions
  }

  const allowedRoles = PERMISSIONS[permission] || [];
  return allowedRoles.includes(userRole);
};

/**
 * Check if current user can approve a target user's leave request
 * Approval hierarchy:
 * - Admin can approve anyone
 * - HOD can approve faculty reporting to them
 * - Faculty can approve students in their activities
 * - Student cannot approve
 */
const canApprove = async (
  approverRole,
  targetUserId,
  approverId,
  dbConnection,
) => {
  // Admin can approve anyone
  if (approverRole === ROLES.ADMIN) {
    return true;
  }

  // Student cannot approve
  if (approverRole === ROLES.STUDENT) {
    return false;
  }

  // HOD can approve faculty reporting to them
  if (approverRole === ROLES.HOD) {
    try {
      const [faculty] = await dbConnection.query(
        `SELECT id FROM users WHERE id = ? AND report_to = ?`,
        [targetUserId, approverId],
      );
      return faculty.length > 0;
    } catch (error) {
      console.error("Error checking HOD approval permission:", error);
      return false;
    }
  }

  // Faculty can approve students in their activities
  if (approverRole === ROLES.FACULTY) {
    try {
      const [enrollment] = await dbConnection.query(
        `SELECT ae.id FROM activity_enrollments ae
         JOIN activities a ON ae.activity_id = a.id
         WHERE ae.student_id = ? AND a.owner_id = ?`,
        [targetUserId, approverId],
      );
      return enrollment.length > 0;
    } catch (error) {
      console.error("Error checking faculty approval permission:", error);
      return false;
    }
  }

  return false;
};

/**
 * Check approval chain for leave requests
 * Returns who should approve next in the hierarchy
 */
const getNextApprover = async (studentId, dbConnection) => {
  try {
    const [student] = await dbConnection.query(
      `SELECT report_to FROM users WHERE id = ?`,
      [studentId],
    );

    if (!student.length) return null;

    const reportTo = student[0].report_to;

    // Get approver's role
    const [approver] = await dbConnection.query(
      `SELECT id, user_type FROM users WHERE id = ?`,
      [reportTo],
    );

    if (!approver.length) return null;

    // If reportTo is faculty, then next approver is their HOD
    if (approver[0].user_type === ROLES.FACULTY) {
      const [hod] = await dbConnection.query(
        `SELECT id FROM users WHERE id = (SELECT report_to FROM users WHERE id = ?)`,
        [reportTo],
      );
      return hod.length > 0 ? hod[0].id : null;
    }

    // If reportTo is HOD, next approver is admin (global)
    if (approver[0].user_type === ROLES.HOD) {
      return "ADMIN"; // Special marker for admin
    }

    return reportTo;
  } catch (error) {
    console.error("Error getting next approver:", error);
    return null;
  }
};

/**
 * Get data access level for user
 * Determines what data a user can see based on their role and relationships
 */
const getDataAccessLevel = async (userId, userRole, dbConnection) => {
  try {
    if (userRole === ROLES.ADMIN) {
      return {
        level: "GLOBAL", // Can see everything
        filters: [], // No filters
      };
    }

    if (userRole === ROLES.HOD) {
      // HOD can see only their department
      const [hod] = await dbConnection.query(
        `SELECT id FROM users WHERE id = ? AND user_type = 'hod'`,
        [userId],
      );

      return {
        level: "DEPARTMENT",
        hodId: userId,
        filters: [`hod_id = ${userId}`],
      };
    }

    if (userRole === ROLES.FACULTY) {
      // Faculty can see their own and their students' data
      return {
        level: "ACTIVITY",
        facultyId: userId,
        filters: [`owner_id = ${userId}`],
      };
    }

    if (userRole === ROLES.STUDENT) {
      // Student can see only their own data
      return {
        level: "PERSONAL",
        studentId: userId,
        filters: [`student_id = ${userId}`],
      };
    }

    return {
      level: "NONE",
      filters: ["1=0"], // No access
    };
  } catch (error) {
    console.error("Error determining data access level:", error);
    return {
      level: "NONE",
      filters: ["1=0"],
    };
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  canApprove,
  getNextApprover,
  getDataAccessLevel,
};
