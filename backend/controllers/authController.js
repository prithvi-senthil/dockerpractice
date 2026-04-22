const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID ||
    "800231155792-ahm9cf1p82ho2sn0irlkr7u72pb6n149.apps.googleusercontent.com",
);

exports.register = async (req, res) => {
  try {
    const { name, email, password, user_type } = req.body;

    if (!name || !email || !password || !user_type) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, user_type, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())",
      [name, email, hashedPassword, user_type],
    );

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt:", email); // Debug log

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email],
    );

    if (users.length === 0) {
      console.log("❌ User not found:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = users[0];
    console.log("✅ User found:", user.email, "Type:", user.user_type);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    console.log("🔑 Password match:", isMatch); // Debug log

    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    console.log("✅ Login successful:", user.name, user.user_type);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};
// Google OAuth Login
exports.googleLogin = async (req, res) => {
  try {
    const { email, serverAuthCode } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log("🔐 Google login attempt for:", email);

    // Check if user exists in database
    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ? AND is_active = TRUE",
      [email],
    );

    if (users.length === 0) {
      console.log("❌ User not found in database:", email);
      return res.status(401).json({
        error:
          "User not registered in the system. Please contact the administrator.",
      });
    }

    const user = users[0];
    console.log("✅ User found:", user.name, "Type:", user.user_type);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    console.log("✅ Google login successful:", user.name, user.user_type);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("❌ Google login error:", error.message);
    res.status(500).json({ error: "Google login failed" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, user_type FROM users WHERE id = ?",
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(users[0]);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
};

// Test Login - FOR DEVELOPMENT ONLY
// Generates a proper JWT token for testing without database query
exports.testLogin = async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ error: "Email and userType are required" });
    }

    // Map user type (handle both "faculty"/"hod"/"student" and "admin")
    const validTypes = ["admin", "hod", "faculty", "student"];
    const type = validTypes.includes(userType) ? userType : "student";

    console.log("🧪 Test login for:", email, "Type:", type);
    console.log("🔑 JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log(
      "🔑 JWT_SECRET first 20 chars:",
      process.env.JWT_SECRET?.substring(0, 20) || "NOT SET",
    );

    // Create test user object
    const testUser = {
      id: `test-${Date.now()}`,
      name: email.split("@")[0],
      email: email,
      user_type: type,
      isTestUser: true,
    };

    // Generate a proper JWT token
    const tokenPayload = {
      id: testUser.id,
      email: testUser.email,
      user_type: testUser.user_type,
      name: testUser.name,
    };

    console.log("🧪 Token payload:", tokenPayload);

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d", // 7 days for test tokens during development
    });

    console.log("🧪 JWT token generated:", token.substring(0, 50) + "...");
    console.log(
      "✅ Test login successful - JWT generated for:",
      testUser.name,
      testUser.user_type,
    );

    res.json({
      token,
      user: testUser,
    });
  } catch (error) {
    console.error("❌ Test login error:", error.message);
    console.error("❌ Full error:", error);
    res.status(500).json({ error: "Test login failed" });
  }
};
