import mongoose from 'mongoose';

const vaultItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  content: {
    type: String,
    required: true
  },
  encryptedContent: String,
  type: {
    type: String,
    enum: ['document', 'note', 'media', 'credential'],
    required: true
  },
  filePath: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  category: String,
  tags: [String],
  isEncrypted: {
    type: Boolean,
    default: true
  },
  sharedWith: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrustedContact'
    },
    accessLevel: {
      type: String,
      enum: ['view', 'download'],
      default: 'view'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  accessLog: [{
    contactId: mongoose.Schema.Types.ObjectId,
    accessedAt: Date,
    action: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('VaultItem', vaultItemSchema);
