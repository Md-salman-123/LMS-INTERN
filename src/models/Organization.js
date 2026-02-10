import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide organization name'],
    },
    logo: {
      type: String,
      default: '',
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#3b82f6',
      },
      secondaryColor: {
        type: String,
        default: '#64748b',
      },
    },
    settings: {
      allowSelfEnrollment: {
        type: Boolean,
        default: false,
      },
      requireApproval: {
        type: Boolean,
        default: true,
      },
      defaultRole: {
        type: String,
        enum: ['learner', 'trainer'],
        default: 'learner',
      },
    },
  },
  {
    timestamps: true,
  }
);

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;


