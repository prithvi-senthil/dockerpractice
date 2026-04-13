const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const auditLogsController = require("../controllers/auditLogsController");

// Middleware
router.use(auth);

// Routes
router.get("/", auditLogsController.getLogs);
router.get("/entity-types", auditLogsController.getEntityTypes);
router.get("/summary", auditLogsController.getSummary);
router.get("/:id", auditLogsController.getById);

module.exports = router;
