import express from 'express';
import VaultItem from '../models/VaultItem.js';
import User from '../models/User.js';
import TrustedContact from '../models/TrustedContact.js';
import Trigger from '../models/Trigger.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Create a backup of all user data
 */
router.post('/backup', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -twoFactorSecret -twoFactorBackupCodes');
    const vaultItems = await VaultItem.find({ userId: req.userId });
    const trustedContacts = await TrustedContact.find({ userId: req.userId });
    const triggers = await Trigger.find({ userId: req.userId });

    const backupData = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      vaultItems: vaultItems.map(item => ({
        title: item.title,
        description: item.description,
        type: item.type,
        category: item.category,
        content: item.content,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        isEncrypted: item.isEncrypted,
        sharedWith: item.sharedWith
      })),
      trustedContacts: trustedContacts.map(contact => ({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        relationship: contact.relationship,
        role: contact.role,
        sendEmail: contact.sendEmail
      })),
      triggers: triggers.map(trigger => ({
        name: trigger.name,
        description: trigger.description,
        triggerType: trigger.triggerType,
        inactivityDays: trigger.inactivityDays,
        triggerDate: trigger.triggerDate,
        triggerTime: trigger.triggerTime,
        isActive: trigger.isActive,
        accessGrants: trigger.accessGrants
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=`backup-${new Date().toISOString().split("T")[0]}.json`');
    res.json(backupData);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Restore data from backup
 * Note: This should be handled carefully - ensure user confirms before overwriting
 */
router.post('/restore', authMiddleware, async (req, res) => {
  try {
    const { backupData, overwrite } = req.body;

    if (!backupData) {
      return res.status(400).json({ message: 'Backup data is required' });
    }

    const userId = req.userId;

    // If not overwrite, only restore missing items
    if (!overwrite) {
      // Restore vault items
      if (backupData.vaultItems && Array.isArray(backupData.vaultItems)) {
        for (const item of backupData.vaultItems) {
          const existingItem = await VaultItem.findOne({
            userId,
            title: item.title
          });

          if (!existingItem) {
            const newItem = new VaultItem({
              userId,
              ...item
            });
            await newItem.save();
          }
        }
      }

      // Restore trusted contacts
      if (backupData.trustedContacts && Array.isArray(backupData.trustedContacts)) {
        for (const contact of backupData.trustedContacts) {
          const existingContact = await TrustedContact.findOne({
            userId,
            email: contact.email
          });

          if (!existingContact) {
            const newContact = new TrustedContact({
              userId,
              ...contact
            });
            await newContact.save();
          }
        }
      }

      // Restore triggers
      if (backupData.triggers && Array.isArray(backupData.triggers)) {
        for (const trigger of backupData.triggers) {
          const existingTrigger = await Trigger.findOne({
            userId,
            name: trigger.name
          });

          if (!existingTrigger) {
            const newTrigger = new Trigger({
              userId,
              ...trigger
            });
            await newTrigger.save();
          }
        }
      }

      return res.json({
        message: 'Backup restored successfully (non-overwrite mode)',
        restored: true
      });
    }

    // If overwrite mode (dangerous - should require confirmation)
    // Delete existing data and restore from backup
    await VaultItem.deleteMany({ userId });
    await TrustedContact.deleteMany({ userId });
    await Trigger.deleteMany({ userId });

    // Restore vault items
    if (backupData.vaultItems && Array.isArray(backupData.vaultItems)) {
      const itemsToInsert = backupData.vaultItems.map(item => ({
        userId,
        ...item
      }));
      await VaultItem.insertMany(itemsToInsert);
    }

    // Restore trusted contacts
    if (backupData.trustedContacts && Array.isArray(backupData.trustedContacts)) {
      const contactsToInsert = backupData.trustedContacts.map(contact => ({
        userId,
        ...contact
      }));
      await TrustedContact.insertMany(contactsToInsert);
    }

    // Restore triggers
    if (backupData.triggers && Array.isArray(backupData.triggers)) {
      const triggersToInsert = backupData.triggers.map(trigger => ({
        userId,
        ...trigger
      }));
      await Trigger.insertMany(triggersToInsert);
    }

    res.json({
      message: 'Backup restored successfully (overwrite mode)',
      restored: true
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
