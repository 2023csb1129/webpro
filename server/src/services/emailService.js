import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"micro-AIMS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP for micro-AIMS Login',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎓 micro-AIMS</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">Academic Information Management System</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Your One-Time Password</h2>
            <p style="color: #666;">Use the following OTP to complete your login:</p>
            
            <div style="background: #1e3a5f; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            
            <p style="color: #666; font-size: 14px;">
              ⏰ This OTP is valid for <strong>5 minutes</strong>.<br>
              🔒 Do not share this code with anyone.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you didn't request this OTP, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Send enrollment notification email
export const sendEnrollmentNotification = async (to, type, data) => {
  try {
    const transporter = createTransporter();

    let subject, content;

    switch (type) {
      case 'request_to_instructor':
        subject = `New Enrollment Request: ${data.courseName}`;
        content = `
          <h2>New Enrollment Request</h2>
          <p><strong>${data.studentName}</strong> (${data.studentEmail}) has requested enrollment in <strong>${data.courseName}</strong> (${data.courseCode}).</p>
          <p>Please login to micro-AIMS to approve or reject this request.</p>
        `;
        break;

      case 'request_to_advisor':
        subject = `Enrollment Pending Advisor Approval: ${data.courseName}`;
        content = `
          <h2>Enrollment Request Approved by Instructor</h2>
          <p><strong>${data.studentName}</strong>'s enrollment in <strong>${data.courseName}</strong> has been approved by the instructor.</p>
          <p>Please login to micro-AIMS for final approval.</p>
        `;
        break;

      case 'enrollment_approved':
        subject = `Enrollment Confirmed: ${data.courseName}`;
        content = `
          <h2>🎉 Congratulations!</h2>
          <p>Your enrollment in <strong>${data.courseName}</strong> (${data.courseCode}) has been approved!</p>
          <p>You are now officially enrolled in this course.</p>
        `;
        break;

      case 'enrollment_rejected':
        subject = `Enrollment Request Rejected: ${data.courseName}`;
        content = `
          <h2>Enrollment Request Rejected</h2>
          <p>Unfortunately, your enrollment request for <strong>${data.courseName}</strong> has been rejected.</p>
          ${data.remarks ? `<p><strong>Reason:</strong> ${data.remarks}</p>` : ''}
        `;
        break;

      default:
        return { success: false, error: 'Unknown notification type' };
    }

    const mailOptions = {
      from: `"micro-AIMS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎓 micro-AIMS</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            ${content}
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
