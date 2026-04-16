const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const settingsController = require("../controllers/settingsController");

// Middleware - All settings routes require authentication
router.use(auth);

// OTP Validity Settings
router.get("/otp-validity", settingsController.getOtpValidity);
router.put("/otp-validity", settingsController.updateOtpValidity);

// Working Hours Settings
router.get("/working-hours", settingsController.getWorkingHours);
router.put("/working-hours", settingsController.updateWorkingHours);

module.exports = router;
