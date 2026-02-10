import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'trainer', 'learner', 'student', 'instructor'],
      default: 'student',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    profile: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      avatar: String,
      bio: String,
      dateOfBirth: Date,
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      socialLinks: {
        linkedin: String,
        twitter: String,
        website: String,
      },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Email verification (OTP)
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationOtp: String,
    emailVerificationOtpExpire: Date,
    // Gamification (GUVI-like features)
    points: {
      type: Number,
      default: 0,
    },
    streak: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastActiveDate: Date,
    },
    level: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Role helper methods
userSchema.methods.isAdmin = function () {
  return ['super_admin', 'admin'].includes(this.role);
};

userSchema.methods.isInstructor = function () {
  return ['trainer', 'instructor'].includes(this.role);
};

userSchema.methods.isStudent = function () {
  return ['learner', 'student'].includes(this.role);
};

// Get display role name
userSchema.virtual('displayRole').get(function () {
  const roleMap = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    trainer: 'Instructor',
    instructor: 'Instructor',
    learner: 'Student',
    student: 'Student',
  };
  return roleMap[this.role] || this.role;
});

// Get full name
userSchema.virtual('fullName').get(function () {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.email;
});

const User = mongoose.model('User', userSchema);

export default User;

