import cron from 'node-cron';
import User from '../models/User.js';
import { checkAndSendInactivityReminder } from './inactivity.js';

let schedulerStarted = false;

/**
 * Start the inactivity reminder scheduler
 * Runs every day at 2:00 AM
 */
export const startInactivityScheduler = () => {
  if (schedulerStarted) {
    console.log('[SCHEDULER] Inactivity scheduler already running');
    return;
  }

  // Schedule job: Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    console.log('[SCHEDULER] Running inactivity check...');
    try {
      // Find all users with inactivity reminders enabled
      const users = await User.find({ inactivityReminderEnabled: true });
      console.log(`[SCHEDULER] Found ${users.length} users with inactivity reminders enabled`);

      let remindersCount = 0;
      const results = [];

      for (const user of users) {
        const result = await checkAndSendInactivityReminder(user);
        results.push({
          userId: user._id,
          email: user.email,
          ...result
        });

        if (result.sent) {
          remindersCount++;
        }
      }

      console.log(`[SCHEDULER] Inactivity check completed. Reminders sent: ${remindersCount}/${users.length}`);
      console.log('[SCHEDULER] Details:', results);
    } catch (error) {
      console.error('[SCHEDULER] Error in inactivity scheduler:', error);
    }
  });

  schedulerStarted = true;
  console.log('[SCHEDULER] Inactivity reminder scheduler started (runs at 2:00 AM daily)');
};

/**
 * Run inactivity check manually (for testing or on-demand)
 */
export const runInactivityCheckManually = async () => {
  console.log('[SCHEDULER] Running manual inactivity check...');
  try {
    const users = await User.find({ inactivityReminderEnabled: true });
    console.log(`[SCHEDULER] Found ${users.length} users with inactivity reminders enabled`);

    let remindersCount = 0;
    const results = [];

    for (const user of users) {
      const result = await checkAndSendInactivityReminder(user);
      results.push({
        userId: user._id,
        email: user.email,
        ...result
      });

      if (result.sent) {
        remindersCount++;
      }
    }

    console.log(`[SCHEDULER] Manual check completed. Reminders sent: ${remindersCount}/${users.length}`);
    return { remindersCount, total: users.length, results };
  } catch (error) {
    console.error('[SCHEDULER] Error in manual inactivity check:', error);
    throw error;
  }
};

export default { startInactivityScheduler, runInactivityCheckManually };
