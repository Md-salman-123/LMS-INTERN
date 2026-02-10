import mongoose from 'mongoose';

const globalSettingsSchema = new mongoose.Schema(
  {
    // Single document (system-wide). Query without org.
    branding: {
      siteName: { type: String, default: 'Learning Management System' },
      siteLogo: String,
      siteFavicon: String,
      tagline: String,
    },
    domain: {
      primary: { type: String, default: '' },
      allowedOrigins: [String],
    },
    language: {
      default: { type: String, default: 'en' },
      supported: [{ type: String }],
    },
    security: {
      enforce2FA: { type: Boolean, default: false },
      backupSchedule: { type: String, default: '' },
      accessRules: {
        ipAllowlist: [String],
        ipBlocklist: [String],
      },
    },
  },
  { timestamps: true }
);

const GlobalSettings = mongoose.model('GlobalSettings', globalSettingsSchema);

export default GlobalSettings;
