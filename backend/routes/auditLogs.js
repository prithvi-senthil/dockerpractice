const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const controller = require("../controllers/auditLogsController");

// Require admin access for all audit log routes
const requireAdminAccess = (req, res, next) => {
  console.log("🔍 AUDIT-LOGS v2 access check - User:", {
    id: req.user?.id,
    user_type: req.user?.user_type,
    email: req.user?.email,
  });

  // Check if user is admin type
  if (req.user?.user_type !== "admin") {
    console.warn("❌ Access denied - User is not admin:", req.user?.user_type);
    return res.status(403).json({
      error: "Only admin users can view audit logs (v2 updated)",
    });
  }

  console.log("✅ Admin access granted");
  next();
};

// GET /api/audit-logs              – paginated log list with filters
router.get("/", auth, requireAdminAccess, controller.getLogs);

// GET /api/audit-logs/entity-types – distinct entity types (for filter dropdown)
router.get(
  "/entity-types",
  auth,
  requireAdminAccess,
  controller.getEntityTypes,
);

module.exports = router;
