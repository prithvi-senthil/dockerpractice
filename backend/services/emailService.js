const nodemailer = require("nodemailer");

// Configure your email service here
// Using Gmail as example (requires app password if using Gmail)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "your-app-password",
  },
});

/**
 * Send HOD Welcome Email with login credentials
 * @param {string} email - HOD email
 * @param {string} name - HOD name
 * @param {string} department - Department name
 * @param {string} password - Auto-generated password
 */
const sendHODWelcomeEmail = async (email, name, department, password) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@attendanceapp.com",
      to: email,
      subject: "Welcome to Attendance Management System - HOD Account Created",
      html: `
        <h2>Welcome to the Attendance Management System!</h2>
        <p>Dear ${name},</p>
        <p>Your HOD account has been successfully created by the Admin.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Department:</strong> ${department}</p>
          <p><strong>Role:</strong> Head of Department (HOD)</p>
        </div>
        
        <p><strong>What You Can Do:</strong></p>
        <ul>
          <li>View courses in your department</li>
          <li>Assign Faculty to courses</li>
          <li>Approve/Reject faculty leave requests</li>
          <li>View department statistics</li>
          <li>Monitor attendance records</li>
        </ul>
        
        <p><strong>⚠️ Important:</strong></p>
        <ul>
          <li>✓ Change your password after first login</li>
          <li>✓ Keep credentials confidential</li>
          <li>✓ You can only manage your department's data</li>
        </ul>
        
        <p>If you have any questions, please contact the Admin.</p>
        
        <hr style="margin-top: 30px;">
        <p><small>This is an automated email. Please do not reply.</small></p>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] HOD welcome email sent to ${email}`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `[EMAIL ERROR] Failed to send email to ${email}:`,
      error.message,
    );
    return { success: false, error: error.message };
  }
};

/**
 * Send Faculty Welcome Email
 */
const sendFacultyWelcomeEmail = async (email, name, password, hod_name) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@attendanceapp.com",
      to: email,
      subject:
        "Welcome to Attendance Management System - Faculty Account Created",
      html: `
        <h2>Welcome to the Attendance Management System!</h2>
        <p>Dear ${name},</p>
        <p>Your Faculty account has been successfully created by the Admin.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Reports To:</strong> ${hod_name}</p>
          <p><strong>Role:</strong> Faculty</p>
        </div>
        
        <p><strong>What You Can Do:</strong></p>
        <ul>
          <li>Create activities for your courses</li>
          <li>Generate OTP for student attendance</li>
          <li>View student attendance records</li>
          <li>Request leave</li>
        </ul>
        
        <p>If you have any questions, please contact your HOD.</p>
        
        <hr style="margin-top: 30px;">
        <p><small>This is an automated email. Please do not reply.</small></p>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL] Faculty welcome email sent to ${email}`,
      result.messageId,
    );
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `[EMAIL ERROR] Failed to send email to ${email}:`,
      error.message,
    );
    return { success: false, error: error.message };
  }
};

/**
 * Send Student Welcome Email
 */
const sendStudentWelcomeEmail = async (email, name, password) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@attendanceapp.com",
      to: email,
      subject:
        "Welcome to Attendance Management System - Student Account Created",
      html: `
        <h2>Welcome to the Attendance Management System!</h2>
        <p>Dear ${name},</p>
        <p>Your Student account has been successfully created by the Admin.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Role:</strong> Student</p>
        </div>
        
        <p><strong>What You Can Do:</strong></p>
        <ul>
          <li>Mark attendance with OTP (provided by faculty)</li>
          <li>View your attendance records</li>
          <li>Check attendance percentage</li>
          <li>Request leave</li>
        </ul>
        
        <p>If you have any questions, please contact your Faculty or Admin.</p>
        
        <hr style="margin-top: 30px;">
        <p><small>This is an automated email. Please do not reply.</small></p>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL] Student welcome email sent to ${email}`,
      result.messageId,
    );
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `[EMAIL ERROR] Failed to send email to ${email}:`,
      error.message,
    );
    return { success: false, error: error.message };
  }
};

/**
 * Send Password Reset Email
 */
const sendPasswordResetEmail = async (email, resetToken, name) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER || "noreply@attendanceapp.com",
      to: email,
      subject: "Password Reset Request - Attendance Management System",
      html: `
        <h2>Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        
        <div style="margin: 20px 0;">
          <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p><strong>This link expires in 1 hour.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
        
        <hr style="margin-top: 30px;">
        <p><small>This is an automated email. Please do not reply.</small></p>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL] Password reset email sent to ${email}`,
      result.messageId,
    );
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `[EMAIL ERROR] Failed to send reset email to ${email}:`,
      error.message,
    );
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendHODWelcomeEmail,
  sendFacultyWelcomeEmail,
  sendStudentWelcomeEmail,
  sendPasswordResetEmail,
};
