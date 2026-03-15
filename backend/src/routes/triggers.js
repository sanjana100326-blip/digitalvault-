import express from 'express';
import Trigger from '../models/Trigger.js';
import User from '../models/User.js';
import TrustedContact from '../models/TrustedContact.js';
import { authMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { sendAccessGrantedEmail } from '../utils/email.js';
import { handleTriggerActivation } from '../utils/triggerNotifications.js';

const router = express.Router();

const resolveTimeBasedTriggerDate = (trigger) => {
  const sourceDate = trigger.triggerDate || trigger.triggerCondition?.date;
  if (!sourceDate) {
    return null;
  }

  const triggerDate = new Date(sourceDate);
  if (Number.isNaN(triggerDate.getTime())) {
    return null;
  }

  const sourceTime = trigger.triggerTime || trigger.triggerCondition?.time || '00:00';
  const [hours, minutes] = String(sourceTime).split(':');
  triggerDate.setHours(parseInt(hours || '0', 10), parseInt(minutes || '0', 10), 0, 0);

  return Number.isNaN(triggerDate.getTime()) ? null : triggerDate;
};

const resolveDateRange = (trigger) => {
  const start = new Date(trigger.startDate || trigger.triggerCondition?.startDate);
  const end = new Date(trigger.endDate || trigger.triggerCondition?.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  return { start, end };
};

const resolveInactivityDays = (trigger) => {
  const value = trigger.inactivityDays ?? trigger.triggerCondition?.inactivityDays;
  const days = Number(value);
  return Number.isFinite(days) && days > 0 ? days : null;
};

// Create trigger
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      triggerType, 
      inactivityDays, 
      triggerDate, 
      startDate,
      endDate,
      triggerTime, 
      accessGrants,
      notificationEmails,
      notificationMessage,
      webhookUrl,
      webhookEnabled,
      webhookHeaders,
      conditions,
      conditionLogic,
      autoExecute
    } = req.body;
    
    const trigger = new Trigger({
      userId: req.userId,
      name,
      description,
      triggerType,
      inactivityDays: triggerType === 'inactivity-based' ? inactivityDays : null,
      triggerDate: triggerType === 'time-based' ? triggerDate : null,
      startDate: triggerType === 'date-range' ? startDate : null,
      endDate: triggerType === 'date-range' ? endDate : null,
      triggerTime: triggerType === 'time-based' ? triggerTime : '00:00',
      accessGrants: accessGrants || [],
      notificationEmails: notificationEmails || [],
      notificationMessage,
      webhookUrl,
      webhookEnabled: webhookEnabled || false,
      webhookHeaders,
      conditions: conditions || [],
      conditionLogic: conditionLogic || 'AND',
      autoExecute: autoExecute !== false, // Default true
      isActive: true
    });
    
    await trigger.save();

    // Log activity
    await logActivity(req.userId, 'created_trigger', `Created trigger "${name}" (${triggerType})`);

    // Auto-activate trigger if conditions are already met
    const now = new Date();
    let shouldActivate = false;

    if (triggerType === 'time-based') {
      const triggerDateObj = new Date(triggerDate);
      const [hours, minutes] = (triggerTime || '00:00').split(':');
      triggerDateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      shouldActivate = now >= triggerDateObj;
    } else if (triggerType === 'date-range') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      shouldActivate = now >= start && now <= end;
    } else if (triggerType === 'inactivity-based') {
      const user = await User.findById(req.userId);
      const lastActivityDate = new Date(user.lastActivityAt);
      const inactivityMs = inactivityDays * 24 * 60 * 60 * 1000;
      shouldActivate = (now - lastActivityDate) >= inactivityMs;
    }

    if (shouldActivate && autoExecute !== false) {
      trigger.isTriggered = true;
      trigger.triggeredAt = now;

      // Get all beneficiaries and send them emails
      const contacts = await TrustedContact.find({
        userId: req.userId,
        role: 'beneficiary'
      });

      const user = await User.findById(req.userId);

      // Use advanced trigger notification handler
      const notificationResult = await handleTriggerActivation(trigger, user, {
        beneficiaryCount: contacts.length
      });

      trigger.notificationSent = notificationResult.email?.success || false;
      trigger.notificationSentAt = now;

      // Send access granted emails to each beneficiary
      let beneficiaryEmailCount = 0;
      for (const contact of contacts) {
        try {
          const emailResult = await sendAccessGrantedEmail(
            contact,
            user.firstName || user.username
          );
          if (emailResult.success) {
            beneficiaryEmailCount++;
          }
        } catch (emailError) {
          console.error(`[TRIGGER-CREATE] Failed to email beneficiary ${contact.email}:`, emailError);
        }
      }

      await logActivity(req.userId, 'trigger_activated', `Trigger "${name}" auto-activated on creation. Sent access emails to ${beneficiaryEmailCount}/${contacts.length} beneficiaries`);
    }

    await trigger.save();

    res.status(201).json({
      message: 'Trigger created' + (shouldActivate ? ' and activated' : ''),
      trigger
    });
  } catch (error) {
    console.error('Error creating trigger:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all triggers
router.get('/', authMiddleware, async (req, res) => {
  try {
    const triggers = await Trigger.find({ userId: req.userId });
    res.json(triggers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update trigger
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const trigger = await Trigger.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    
    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }
    
    res.json({
      message: 'Trigger updated',
      trigger
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete trigger
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const trigger = await Trigger.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    await logActivity(req.userId, 'deleted_trigger', `Deleted trigger "${trigger.name}"`);

    res.json({ message: 'Trigger deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check and activate triggers - send emails and webhooks
router.post('/:id/activate', authMiddleware, async (req, res) => {
  try {
    const trigger = await Trigger.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!trigger) {
      return res.status(404).json({ message: 'Trigger not found' });
    }

    // Check if trigger should be activated
    const now = new Date();
    let shouldActivate = false;

    if (trigger.triggerType === 'time-based') {
      const triggerDate = resolveTimeBasedTriggerDate(trigger);
      if (!triggerDate) {
        return res.status(400).json({ message: 'Time-based trigger is missing a valid date/time' });
      }
      
      // Activate if current time is past trigger time
      shouldActivate = now >= triggerDate && !trigger.isTriggered;
    } else if (trigger.triggerType === 'date-range') {
      const range = resolveDateRange(trigger);
      if (!range) {
        return res.status(400).json({ message: 'Date-range trigger is missing valid start/end dates' });
      }
      const { start, end } = range;
      shouldActivate = now >= start && now <= end && !trigger.isTriggered;
    } else if (trigger.triggerType === 'inactivity-based') {
      const user = await User.findById(req.userId);
      const inactivityDays = resolveInactivityDays(trigger);
      if (!inactivityDays) {
        return res.status(400).json({ message: 'Inactivity trigger is missing a valid inactivityDays value' });
      }
      const lastActivityDate = new Date(user.lastActivityAt);
      const inactivityMs = inactivityDays * 24 * 60 * 60 * 1000;
      
      // Activate if user has been inactive for the required days
      shouldActivate = (now - lastActivityDate) >= inactivityMs && !trigger.isTriggered;
    }

    if (shouldActivate) {
      trigger.isTriggered = true;
      trigger.triggeredAt = now;

      // Get user for notification
      const user = await User.findById(req.userId);
      
      // Get all beneficiaries
      const contacts = await TrustedContact.find({
        userId: req.userId,
        role: 'beneficiary'
      });

      console.log(`[ACTIVATE] Found ${contacts.length} beneficiary contacts`);

      // Use advanced trigger notification handler
      const notificationResult = await handleTriggerActivation(trigger, user, {
        beneficiaryCount: contacts.length,
        triggeredAt: now
      });

      trigger.notificationSent = notificationResult.email?.success || false;
      trigger.notificationSentAt = now;
      trigger.webhookLastSentAt = notificationResult.webhook?.success ? now : trigger.webhookLastSentAt;

      await trigger.save();

      // Send access granted emails to each beneficiary
      let beneficiaryEmailCount = 0;
      const beneficiaryEmailResults = [];
      for (const contact of contacts) {
        try {
          const emailResult = await sendAccessGrantedEmail(
            contact,
            user.firstName || user.username
          );
          beneficiaryEmailResults.push({
            email: contact.email,
            success: emailResult.success,
            message: emailResult.message
          });
          if (emailResult.success) {
            beneficiaryEmailCount++;
          }
        } catch (emailError) {
          console.error(`[ACTIVATE] Failed to email beneficiary ${contact.email}:`, emailError);
          beneficiaryEmailResults.push({
            email: contact.email,
            success: false,
            error: emailError.message
          });
        }
      }

      // Log activity
      await logActivity(req.userId, 'trigger_activated', `Trigger "${trigger.name}" activated. Sent access emails to ${beneficiaryEmailCount}/${contacts.length} beneficiaries`);

      res.json({
        success: true,
        message: `Trigger activated and notifications sent to ${beneficiaryEmailCount} beneficiaries`,
        trigger,
        notifications: notificationResult,
        beneficiaryNotifications: {
          sent: beneficiaryEmailCount,
          total: contacts.length,
          details: beneficiaryEmailResults
        }
      });
    } else {
      res.json({
        success: false,
        message: 'Trigger conditions not met yet'
      });
    }
  } catch (error) {
    console.error('Error activating trigger:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
