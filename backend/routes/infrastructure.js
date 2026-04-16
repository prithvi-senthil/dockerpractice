const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const infrastructureController = require("../controllers/infrastructureController");

// Middleware
router.use(auth);

// Routes
router.get("/list", infrastructureController.getList);
router.get("/:id", infrastructureController.getById);
router.post("/create", infrastructureController.create);
router.put("/:id", infrastructureController.update);
router.delete("/:id", infrastructureController.delete);
router.post(
  "/:infraId/check-conflict",
  infrastructureController.checkTimeConflict,
);

module.exports = router;
