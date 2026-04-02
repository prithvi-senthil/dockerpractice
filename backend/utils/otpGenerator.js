// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expires in 10 minutes
function isOTPValid(generatedAt) {
  if (!generatedAt) return false;
  const now = new Date();
  const otpTime = new Date(generatedAt);
  const diffMinutes = (now - otpTime) / 1000 / 60;
  return diffMinutes <= 10; // OTP valid for 10 minutes
}

module.exports = { generateOTP, isOTPValid };