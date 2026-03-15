import express from 'express';
import User from '../models/User.js';
import VaultItem from '../models/VaultItem.js';
import TrustedContact from '../models/TrustedContact.js';
import Trigger from '../models/Trigger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // Count vault items by type
    const vaultStats = await VaultItem.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Count total items
    const totalVaultItems = await VaultItem.countDocuments({ userId: userId });
    const totalContacts = await TrustedContact.countDocuments({ userId: userId });
    const totalTriggers = await Trigger.countDocuments({ userId: userId });

    // Count active triggers
    const activeTriggers = await Trigger.countDocuments({ 
      userId: userId, 
      isActive: true 
    });

    // Get recent activity (last 10 items)
    const user = await User.findById(userId);
    const recentActivity = user.activityLog.slice(-10).reverse();

    // Get vault items by category
    const categoryStats = await VaultItem.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get total storage size (in bytes)
    const storageStats = await VaultItem.aggregate([
      { $match: { userId: userId } },
      {
        $project: {
          size: {
            $cond: {
              if: { $ifNull: ['$encryptedFile', false] },
              then: { $strLenBytes: '$encryptedFile' },
              else: 0
            }
          }
        }
      },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);

    const totalStorage = storageStats.length > 0 ? storageStats[0].totalSize : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalVaultItems,
          totalContacts,
          totalTriggers,
          activeTriggers,
          totalStorage
        },
        vaultByType: vaultStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        vaultByCategory: categoryStats.reduce((acc, item) => {
          acc[item._id || 'uncategorized'] = item.count;
          return acc;
        }, {}),
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

export default router;


