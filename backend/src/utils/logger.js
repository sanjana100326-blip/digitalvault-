import User from '../models/User.js';

export const logActivity = async (userId, action, details = '') => {
  try {
    const user = await User.findById(userId);
    if (user) {
      user.activityLog.push({
        action,
        timestamp: new Date(),
        details
      });
      await user.save();
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export default logActivity;
