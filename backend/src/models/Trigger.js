import mongoose from 'mongoose';

const triggerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  triggerType: {
    type: String,
    enum: ['time-based', 'inactivity-based', 'date-range', 'custom'],
    required: true
  },
  triggerCondition: {
    // For time-based: { date: Date }
    // For inactivity-based: { inactivityDays: Number }
    // For date-range: { startDate: Date, endDate: Date }
    // For custom: { conditions: Array, logic: 'AND' | 'OR' }
    type: mongoose.Schema.Types.Mixed
  },
  // Multiple conditions support
  conditions: [{
    type: {
      type: String,
      enum: ['date', 'inactivity', 'specific-date'],
      default: 'date'
    },
    value: mongoose.Schema.Types.Mixed, // can be date, days, etc.
    operator: String // 'equals', 'before', 'after', 'between'
  }],
  conditionLogic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },
  inactivityDays: Number,
  triggerDate: Date,
  startDate: Date,
  endDate: Date,
  triggerTime: {
    type: String,
    default: '00:00'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTriggered: {
    type: Boolean,
    default: false
  },
  triggeredAt: Date,
  accessGrants: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrustedContact'
    },
    vaultItemIds: [mongoose.Schema.Types.ObjectId],
    accessLevel: {
      type: String,
      enum: ['view', 'download', 'manage'],
      default: 'view'
    }
  }],
  // Notification settings
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
  notificationEmails: [String], // Additional emails to notify on trigger
  notificationMessage: String, // Custom notification message
  // Webhook settings
  webhookUrl: String, // URL to POST trigger event to
  webhookEnabled: {
    type: Boolean,
    default: false
  },
  webhookHeaders: mongoose.Schema.Types.Mixed, // Custom headers for webhook
  webhookLastSentAt: Date,
  // Automation settings
  autoExecute: {
    type: Boolean,
    default: true
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

export default mongoose.model('Trigger', triggerSchema);
