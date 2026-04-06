const redis = require('redis');

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => console.error('❌ Redis Error:', err));
redisClient.on('connect', () => console.log('✅ Redis connected'));

const initializeRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in Redis (5 min expiry)
const storeOTP = async (activityId, otpCode, creatorId) => {
  const key = `otp:activity:${activityId}`;
  const otpData = {
    otp_code: otpCode,
    activity_id: activityId,
    creator_id: creatorId,
    generated_at: new Date().toISOString(),
  };
  await redisClient.setEx(key, 300, JSON.stringify(otpData)); // 5 min expiry
  console.log(`✅ OTP stored: Activity ${activityId}`);
};

// Verify OTP
const verifyOTP = async (activityId, otpCode) => {
  const key = `otp:activity:${activityId}`;
  const otpDataStr = await redisClient.get(key);
  
  if (!otpDataStr) {
    return { valid: false, reason: 'OTP not found or expired' };
  }

  const otpData = JSON.parse(otpDataStr);
  
  if (otpData.otp_code !== otpCode) {
    return { valid: false, reason: 'Invalid OTP code' };
  }

  return { valid: true, otpData };
};

// Get active OTP (for creator to view)
const getActiveOTP = async (activityId) => {
  const key = `otp:activity:${activityId}`;
  const otpDataStr = await redisClient.get(key);
  
  if (!otpDataStr) return null;
  
  const otpData = JSON.parse(otpDataStr);
  const ttl = await redisClient.ttl(key);
  
  return {
    otp_code: otpData.otp_code,
    activity_id: otpData.activity_id,
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