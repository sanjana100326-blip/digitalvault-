import cron from 'node-cron';
import Trigger from '../models/Trigger.js';
import User from '../models/User.js';
import TrustedContact from '../models/TrustedContact.js';
import { handleTriggerActivation } from './triggerNotifications.js';
import { sendAccessGrantedEmail } from './email.js';
import { logActivity } from './logger.js';

let schedulerStarted = false;

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

/**
 * Check if trigger conditions are met
 */
const checkTriggerConditions = async (trigger, user) => {
  const now = new Date();

  if (trigger.triggerType === 'time-based') {
    const triggerDate = resolveTimeBasedTriggerDate(trigger);
    if (!triggerDate) {
      console.warn(`[TRIGGER-SCHEDULER] Skipping invalid time-based trigger ${trigger._id} (${trigger.name})`);
      return false;
    }
    return now >= triggerDate && !trigger.isTriggered;
  }

  if (trigger.triggerType === 'date-range') {
    const range = resolveDateRange(trigger);
    if (!range) {
      console.warn(`[TRIGGER-SCHEDULER] Skipping invalid date-range trigger ${trigger._id} (${trigger.name})`);
      return false;
    }
    const { start, end } = range;
    return now >= start && now <= end && !trigger.isTriggered;
  }

  if (trigger.triggerType === 'inactivity-based') {
    const inactivityDays = resolveInactivityDays(trigger);
    if (!inactivityDays) {
      console.warn(`[TRIGGER-SCHEDULER] Skipping invalid inactivity trigger ${trigger._id} (${trigger.name})`);
      return false;
    }

    const lastActivityDate = new Date(user.lastActivityAt);
    const inactivityMs = inactivityDays * 24 * 60 * 60 * 1000;
    return (now - lastActivityDate) >= inactivityMs && !trigger.isTriggered;
  }

  return false;
};

/**
 * Activate a single trigger
 */
const activateTrigger = async (trigger, user) => {
  try {
    console.log(`[TRIGGER-SCHEDULER] Activating trigger: ${trigger.name}`);

    const triggeredAt = new Date();
    const claimedTrigger = await Trigger.findOneAndUpdate(
      { _id: trigger._id, isTriggered: false },
      { $set: { isTriggered: true, triggeredAt } },
      { new: true }
    );

    if (!claimedTrigger) {
      console.log(`[TRIGGER-SCHEDULER] Trigger already processed or no longer exists: ${trigger._id}`);
      return { success: false, skipped: true, reason: 'already-processed' };
    }

    // Get beneficiaries for notification
    const beneficiaries = await TrustedContact.find({
      userId: user._id,
      role: 'beneficiary'
    });

    // Send notifications
    const notificationResult = await handleTriggerActivation(trigger, user, {
      beneficiaryCount: beneficiaries.length,
      triggeredAt,
      automatic: true
    });

    await Trigger.updateOne(
      { _id: trigger._id },
      {
        $set: {
          notificationSent: notificationResult.email?.success || false,
          notificationSentAt: triggeredAt,
          ...(notificationResult.webhook?.success ? { webhookLastSentAt: triggeredAt } : {})
        }
      }
    );

    // Send access granted emails to each beneficiary
    let beneficiaryEmailCount = 0;
    for (const beneficiary of beneficiaries) {
      try {
        const emailResult = await sendAccessGrantedEmail(
          beneficiary,
          user.firstName || user.username
        );
        if (emailResult.success) {
          beneficiaryEmailCount++;
          console.log(`[TRIGGER-SCHEDULER] ✅ Access email sent to beneficiary: ${beneficiary.email}`);
        }
      } catch (emailError) {
        console.error(`[TRIGGER-SCHEDULER] Failed to email beneficiary ${beneficiary.email}:`, emailError);
      }
    }

    // Log activity
    await logActivity(user._id, 'trigger_activated_auto', 
      `Trigger "${trigger.name}" automatically activated. Sent access emails to ${beneficiaryEmailCount}/${beneficiaries.length} beneficiaries`);

    console.log(`[TRIGGER-SCHEDULER] ✅ Trigger activated: ${trigger.name}. Beneficiary emails sent: ${beneficiaryEmailCount}/${beneficiaries.length}`);
    return { success: true, notificationResult, beneficiaryEmailCount };
  } catch (error) {
    console.error(`[TRIGGER-SCHEDULER] ❌ Error activating trigger ${trigger.name}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Run the periodic trigger check
 */
export const runTriggerCheck = async () => {
  console.log(`[TRIGGER-SCHEDULER] Running automatic trigger check...`);
  try {
    const orphanTriggers = await Trigger.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'owner'
        }
      },
      {
        $match: {
          owner: { $size: 0 }
        }
      },
      {
        $project: { _id: 1 }
      }
    ]);

    if (orphanTriggers.length > 0) {
      const orphanIds = orphanTriggers.map((trigger) => trigger._id);
      await Trigger.deleteMany({ _id: { $in: orphanIds } });
      console.log(`[TRIGGER-SCHEDULER] Removed ${orphanIds.length} orphan trigger(s) for deleted users`);
    }

    // Get all active, non-triggered triggers
    const triggers = await Trigger.find({
      isActive: true,
      isTriggered: false,
      autoExecute: true
    });

    console.log(`[TRIGGER-SCHEDULER] Found ${triggers.length} active triggers to check`);

    let activatedCount = 0;
    const results = [];

    for (const trigger of triggers) {
      try {
        // Get the user
        const user = await User.findById(trigger.userId);
        if (!user) {
          console.log(`[TRIGGER-SCHEDULER] User not found for trigger ${trigger._id}; removing orphan trigger`);
          await Trigger.deleteOne({ _id: trigger._id });
          continue;
        }

        // Check if conditions are met
        const shouldActivate = await checkTriggerConditions(trigger, user);

        if (shouldActivate) {
          const result = await activateTrigger(trigger, user);
          results.push({
            triggerId: trigger._id,
            triggerName: trigger.name,
            ...result
          });
          activatedCount++;
        }
      } catch (error) {
        console.error(`[TRIGGER-SCHEDULER] Error checking trigger ${trigger._id}:`, error);
        results.push({
          triggerId: trigger._id,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`[TRIGGER-SCHEDULER] Check completed. Activated: ${activatedCount}/${triggers.length}`);
    return { activatedCount, total: triggers.length, results };
  } catch (error) {
    console.error(`[TRIGGER-SCHEDULER] Error in trigger check:`, error);
    throw error;
  }
};

/**
 * Start the trigger scheduler
 * Runs every minute to check trigger conditions
 */
export const startTriggerScheduler = () => {
  if (schedulerStarted) {
    console.log('[TRIGGER-SCHEDULER] Already running');
    return;
  }

  // Schedule: Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await runTriggerCheck();
    } catch (error) {
      console.error('[TRIGGER-SCHEDULER] Scheduler error:', error);
    }
  });

  schedulerStarted = true;
  console.log('[TRIGGER-SCHEDULER] Started (checks every minute)');
};

export default { startTriggerScheduler, runTriggerCheck };
