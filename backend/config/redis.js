const redis = require("redis");

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));

const initializeRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in Redis (10 SECONDS expiry - per SRS requirement)
const storeOTP = async (key, otpCode, creatorId) => {
  const otpData = {
    otp_code: otpCode,
    creator_id: creatorId,
    generated_at: new Date().toISOString(),
  };
  await redisClient.setEx(key, 10, JSON.stringify(otpData)); // 10 SECONDS
  console.log(`✅ OTP stored (10s): ${key}`);
};

// Verify OTP
const verifyOTP = async (key, otpCode) => {
  const otpDataStr = await redisClient.get(key);
  
  if (!otpDataStr) {
    return { valid: false, reason: "OTP not found or expired" };
  }

  const otpData = JSON.parse(otpDataStr);
  
  if (otpData.otp_code !== otpCode) {
    return { valid: false, reason: "Invalid OTP code" };
  }

  return { valid: true, otpData };
};

// Get active OTP
const getActiveOTP = async (key) => {
  const otpDataStr = await redisClient.get(key);
  if (!otpDataStr) return null;
  
  const otpData = JSON.parse(otpDataStr);
  const ttl = await redisClient.ttl(key);
  
  return {
    otp_code: otpData.otp_code,
    seconds_remaining: ttl,
  };
};

module.exports = {
  redisClient,
  initializeRedis,
  generateOTP,
  storeOTP,
  verifyOTP,
  getActiveOTP,
};