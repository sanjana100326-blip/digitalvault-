import express from 'express';
import VaultItem from '../models/VaultItem.js';
import User from '../models/User.js';
import TrustedContact from '../models/TrustedContact.js';
import Trigger from '../models/Trigger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Export all user data as JSON
 */
router.get('/export/data', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -twoFactorSecret -twoFactorBackupCodes');
    const vaultItems = await VaultItem.find({ userId: req.userId });
    const trustedContacts = await TrustedContact.find({ userId: req.userId });
    const triggers = await Trigger.find({ userId: req.userId });

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      },
      vaultItems: vaultItems.map(item => ({
        id: item._id,
        title: item.title,
        description: item.description,
        type: item.type,
        category: item.category,
        content: item.content,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        isEncrypted: item.isEncrypted,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      trustedContacts: trustedContacts.map(contact => ({
        id: contact._id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        relationship: contact.relationship,
        role: contact.role,
        createdAt: contact.createdAt
      })),
      triggers: triggers.map(trigger => ({
        id: trigger._id,
        name: trigger.name,
        description: trigger.description,
        triggerType: trigger.triggerType,
        inactivityDays: trigger.inactivityDays,
        triggerDate: trigger.triggerDate,
        triggerTime: trigger.triggerTime,
        isActive: trigger.isActive,
        isTriggered: trigger.isTriggered,
        createdAt: trigger.createdAt
      })),
      activityLog: user.activityLog
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="digital-legacy-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Export vault items only
 */
router.get('/export/vault', authMiddleware, async (req, res) => {
  try {
    const vaultItems = await VaultItem.find({ userId: req.userId });

    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'vault-items',
      count: vaultItems.length,
      items: vaultItems.map(item => ({
        id: item._id,
        title: item.title,
        description: item.description,
        type: item.type,
        category: item.category,
        content: item.content,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        isEncrypted: item.isEncrypted,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="vault-items-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting vault items:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Export activity log
 */
router.get('/export/activity-log', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'activity-log',
      count: user.activityLog.length,
      activityLog: user.activityLog
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="activity-log-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting activity log:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
