import express from 'express';
import TrustedContact from '../models/TrustedContact.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { ensureBeneficiaryInviteToken } from '../utils/beneficiaryInvite.js';
import { logActivity } from '../utils/logger.js';
import { sendBeneficiaryEmail } from '../utils/email.js';

const router = express.Router();

const serializeContact = (contact) => {
  const contactObject = contact.toObject ? contact.toObject() : { ...contact };
  delete contactObject.verificationToken;
  delete contactObject.verificationTokenExpires;
  return contactObject;
};

// Create trusted contact
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, email, relationship, phone, role, canAccessAll, sendEmail } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const existingContact = await TrustedContact.findOne({
      userId: req.userId,
      email: normalizedEmail
    });

    if (existingContact) {
      return res.status(409).json({
        message: 'A trusted contact with this email already exists',
        contact: serializeContact(existingContact)
      });
    }
    
    const contact = new TrustedContact({
      userId: req.userId,
      name: name?.trim(),
      email: normalizedEmail,
      relationship: relationship?.trim(),
      phone: phone?.trim(),
      role: role || 'beneficiary',
      canAccessAll: canAccessAll || false
    });
    
    await contact.save();

    if (contact.role === 'beneficiary') {
      await ensureBeneficiaryInviteToken(contact);
    }

    // Log activity
    await logActivity(req.userId, 'added_contact', `Added ${name} as ${role}`);

    // Send email notification if requested
    let emailResult = { success: false, message: 'Email not sent' };
    if (sendEmail && email && contact.role === 'beneficiary') {
      const user = await User.findById(req.userId);
      const ownerName = `${user.firstName} ${user.lastName}`;
      console.log(`[CONTACT] Sending beneficiary email to ${email} for user ${req.userId}`);
      emailResult = await sendBeneficiaryEmail(contact, ownerName);
      console.log(`[CONTACT] Email result:`, emailResult);
    } else {
      console.log(`[CONTACT] Email not sent - sendEmail: ${sendEmail}, email: ${email}`);
    }

    res.status(201).json({
      message: 'Trusted contact created',
      contact: serializeContact(contact),
      email: emailResult
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all trusted contacts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contacts = await TrustedContact.find({ userId: req.userId });
    res.json(contacts.map(serializeContact));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update trusted contact
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await TrustedContact.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json({
      message: 'Contact updated',
      contact: serializeContact(contact)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete trusted contact
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const contact = await TrustedContact.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    res.json({ message: 'Contact deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
