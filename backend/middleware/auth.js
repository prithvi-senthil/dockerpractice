const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.error("❌ No token provided in Authorization header");
      return res
        .status(401)
        .json({ error: "No authentication token provided" });
    }

    console.log("🔐 Token received:", token.substring(0, 30) + "...");
    console.log("🔑 JWT_SECRET exists:", !!process.env.JWT_SECRET);
    console.log(
      "🔑 JWT_SECRET first 10 chars:",
      process.env.JWT_SECRET?.substring(0, 10) || "NOT SET",
    );

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("✅ Token verified for user:", decoded.email);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.user_type)) {
      return res
        .status(403)
        .json({ error: `Access denied. Required role: ${roles.join(" or ")}` });
    }
    next();
  };
};

module.exports = { auth, requireRole };
