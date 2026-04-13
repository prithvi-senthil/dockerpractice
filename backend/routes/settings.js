const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const settingsController = require("../controllers/settingsController");

// Middleware
router.use(auth);

// Routes
router.get("/otp-validity", settingsController.getOtpValidity);
router.post("/otp-validity", settingsController.updateOtpValidity);

router.get("/working-hours", settingsController.getWorkingHours);
router.post("/working-hours", settingsController.updateWorkingHours);

router.get("/admin-access", settingsController.getAdminAccess);
router.post("/admin-access", settingsController.updateAdminAccess);

module.exports = router;
