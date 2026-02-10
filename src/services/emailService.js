import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Create transporter only if email is configured
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const useSecure = port === 465;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: useSecure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });
}

export const sendEmail = async ({ email, subject, message, html }) => {
  if (!transporter) return false;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject,
    text: message,
    html: html || message,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${email}: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Email send error:', error);
    return false;
  }
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  if (!transporter) {
    return { configured: false, message: 'Email service not configured' };
  }

  try {
    await transporter.verify();
    return { configured: true, message: 'Email service configured and verified' };
  } catch (error) {
    return { configured: false, message: `Email verification failed: ${error.message}` };
  }
};

