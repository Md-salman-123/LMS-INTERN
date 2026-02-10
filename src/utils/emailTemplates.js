// Email templates for notifications

export const emailTemplates = {
  enrollment: (userName, courseName) => ({
    subject: `Enrolled in ${courseName}`,
    html: `
      <h2>Course Enrollment</h2>
      <p>Hello ${userName},</p>
      <p>You have been enrolled in the course: <strong>${courseName}</strong></p>
      <p>You can now access the course from your dashboard.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  }),

  courseCompletion: (userName, courseName) => ({
    subject: `Course Completed: ${courseName}`,
    html: `
      <h2>Congratulations!</h2>
      <p>Hello ${userName},</p>
      <p>You have successfully completed the course: <strong>${courseName}</strong></p>
      <p>Your certificate is now available in your account.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  }),

  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  }),

  verificationOtp: (otp, userName = 'User') => ({
    subject: 'Verify your email - OTP',
    html: `
      <h2>Email Verification</h2>
      <p>Hello ${userName},</p>
      <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px;">${otp}</strong></p>
      <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  }),

  quizReminder: (userName, quizName, courseName) => ({
    subject: `Quiz Reminder: ${quizName}`,
    html: `
      <h2>Quiz Reminder</h2>
      <p>Hello ${userName},</p>
      <p>This is a reminder that you have a quiz: <strong>${quizName}</strong></p>
      <p>Course: ${courseName}</p>
      <p>Please complete the quiz at your earliest convenience.</p>
      <p>Best regards,<br>LMS Team</p>
    `,
  }),
};


