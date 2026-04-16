const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { initializeRedis } = require("./config/redis");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/activities", require("./routes/activityRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/leaves", require("./routes/leaveRoutes"));
app.use("/api/hod", require("./routes/hodCourseRoutes"));
app.use("/api/admin/courses", require("./routes/adminRoutes"));
app.use("/api/admin", require("./routes/adminUserRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/infrastructure", require("./routes/infrastructure"));
app.use("/api/settings", require("./routes/settings"));
app.use("/api/audit-logs", require("./routes/auditLogs"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Attendance API is running" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await initializeRedis();
})();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
