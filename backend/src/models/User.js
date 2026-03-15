import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: String,
  lastName: String,
  avatar: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  twoFactorBackupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  activityLog: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String
  }],
  lastLoginAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  inactivityReminderEnabled: {
    type: Boolean,
    default: false
  },
  inactivityReminderDays: {
    type: Number,
    default: 30
  },
  lastInactivityReminderSentAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(password) {
  return await bcryptjs.compare(password, this.password);
};

export default mongoose.model('User', userSchema);
