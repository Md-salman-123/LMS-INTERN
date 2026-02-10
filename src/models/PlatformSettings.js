import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      unique: true,
    },
    // General settings
    siteName: {
      type: String,
      default: 'Learning Management System',
    },
    siteLogo: String,
    siteFavicon: String,
    // Email settings
    emailSettings: {
      fromEmail: String,
      fromName: String,
      smtpHost: String,
      smtpPort: Number,
      smtpUser: String,
      smtpPassword: String,
      smtpSecure: {
        type: Boolean,
        default: true,
      },
    },
    // Payment settings
    paymentSettings: {
      stripePublicKey: String,
      stripeSecretKey: String,
      paypalClientId: String,
      paypalSecret: String,
      currency: {
        type: String,
        default: 'INR',
      },
    },
    // Course settings
    courseSettings: {
      requireApproval: {
        type: Boolean,
        default: true,
      },
      allowSelfEnrollment: {
        type: Boolean,
        default: true,
      },
      maxFileSize: {
        type: Number,
        default: 100, // MB
      },
    },
    // User settings
    userSettings: {
      allowRegistration: {
        type: Boolean,
        default: true,
      },
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
      defaultRole: {
        type: String,
        default: 'learner',
      },
    },
    // Notification settings
    notificationSettings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: false,
      },
    },
    // Maintenance mode
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: String,
  },
  {
    timestamps: true,
  }
);

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

export default PlatformSettings;

