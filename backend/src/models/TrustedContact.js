import mongoose from 'mongoose';

const trustedContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  relationship: String,
  phone: String,
  role: {
    type: String,
    enum: ['executor', 'beneficiary', 'advisor'],
    default: 'beneficiary'
  },
  permissions: [{
    vaultItemId: mongoose.Schema.Types.ObjectId,
    accessLevel: {
      type: String,
      enum: ['view', 'download', 'manage'],
      default: 'view'
    }
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  canAccessAll: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('TrustedContact', trustedContactSchema);
