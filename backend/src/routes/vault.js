import express from 'express';
import multer from 'multer';
import VaultItem from '../models/VaultItem.js';
import User from '../models/User.js';
import TrustedContact from '../models/TrustedContact.js';
import Trigger from '../models/Trigger.js';
import { authMiddleware } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// Create vault item
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { title, description, content, type, category, tags } = req.body;

    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === 'string' && tags.trim().length
        ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

    let contentString = content;
    let contentPreview = content ? content.substring(0, 100) : '';

    if (req.file) {
      contentString = req.file.buffer.toString('base64');
      contentPreview = req.file.originalname;
    }

    if (!contentString) {
      return res.status(400).json({ message: 'Content or file is required' });
    }

    const encryptedData = encrypt(contentString);

    const vaultItem = new VaultItem({
      userId: req.userId,
      title,
      description,
      content: contentPreview,
      encryptedContent: JSON.stringify(encryptedData),
      type,
      category,
      tags: parsedTags,
      isEncrypted: true,
      fileName: req.file ? req.file.originalname : undefined,
      fileSize: req.file ? req.file.size : undefined,
      mimeType: req.file ? req.file.mimetype : undefined
    });
    
    await vaultItem.save();
    
    // Log activity
    await logActivity(req.userId, 'created_vault_item', `Created "${title}" (${type})`);

    res.status(201).json({
      message: 'Vault item created',
      vaultItem
    });
  } catch (error) {
    console.error('Error creating vault item:', error);
    res.status(500).json({ 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    });
  }
});

// Get all vault items with search, filters, and pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, type, category, tags, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.userId };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await VaultItem.countDocuments(query);
    const vaultItems = await VaultItem.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      items: vaultItems,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get items shared with the logged-in beneficiary (only after owner trigger activation)
router.get('/shared/me', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId).select('email');
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const beneficiaryContacts = await TrustedContact.find({
      email: currentUser.email,
      role: 'beneficiary'
    }).select('_id userId name canAccessAll').lean();

    if (beneficiaryContacts.length === 0) {
      return res.json({ items: [] });
    }

    const ownerIds = [...new Set(beneficiaryContacts.map((contact) => contact.userId.toString()))];
    const triggeredOwnerIds = await Trigger.find({
      userId: { $in: ownerIds },
      isTriggered: true
    }).distinct('userId');

    if (triggeredOwnerIds.length === 0) {
      return res.json({ items: [] });
    }

    const triggeredOwnerIdStrings = triggeredOwnerIds.map((id) => id.toString());
    const activeContacts = beneficiaryContacts.filter((contact) =>
      triggeredOwnerIdStrings.includes(contact.userId.toString())
    );

    const activeContactIds = activeContacts.map((contact) => contact._id);
    const canAccessAllOwnerIds = activeContacts
      .filter((contact) => contact.canAccessAll)
      .map((contact) => contact.userId);

    const query = {
      userId: { $in: triggeredOwnerIds },
      $or: [{ 'sharedWith.contactId': { $in: activeContactIds } }]
    };

    if (canAccessAllOwnerIds.length > 0) {
      query.$or.push({ userId: { $in: canAccessAllOwnerIds } });
    }

    const sharedItems = await VaultItem.find(query)
      .select('userId title description content type category tags fileName fileSize mimeType sharedWith updatedAt createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    const owners = await User.find({ _id: { $in: triggeredOwnerIds } })
      .select('firstName lastName username email')
      .lean();

    const ownerById = owners.reduce((acc, owner) => {
      acc[owner._id.toString()] = owner;
      return acc;
    }, {});

    const contactsByOwner = activeContacts.reduce((acc, contact) => {
      const key = contact.userId.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(contact);
      return acc;
    }, {});

    const items = sharedItems.map((item) => {
      const ownerId = item.userId.toString();
      const ownerContacts = contactsByOwner[ownerId] || [];
      const ownerContactIds = ownerContacts.map((contact) => contact._id.toString());

      const explicitShare = item.sharedWith.find((share) =>
        ownerContactIds.includes(share.contactId?.toString())
      );

      const canAccessAll = ownerContacts.some((contact) => contact.canAccessAll);
      if (!explicitShare && !canAccessAll) {
        return null;
      }

      const owner = ownerById[ownerId];
      return {
        _id: item._id,
        ownerId,
        ownerName: owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.username : 'Owner',
        title: item.title,
        description: item.description,
        contentPreview: item.content,
        type: item.type,
        category: item.category,
        tags: item.tags || [],
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        accessLevel: explicitShare?.accessLevel || 'view',
        grantedVia: explicitShare ? 'shared-item' : 'can-access-all',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      };
    }).filter(Boolean);

    res.json({ items });
  } catch (error) {
    console.error('Error fetching shared items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get one shared item in full for the beneficiary
router.get('/shared/me/:id', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId).select('email');
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const item = await VaultItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Vault item not found' });
    }

    const beneficiaryContacts = await TrustedContact.find({
      userId: item.userId,
      email: currentUser.email,
      role: 'beneficiary'
    }).select('_id canAccessAll name').lean();

    if (beneficiaryContacts.length === 0) {
      return res.status(403).json({ message: 'No beneficiary access found for this vault item' });
    }

    const ownerTriggered = await Trigger.exists({
      userId: item.userId,
      isTriggered: true
    });

    if (!ownerTriggered) {
      return res.status(403).json({ message: 'Access is not active yet. Trigger conditions are not met.' });
    }

    const beneficiaryContactIds = beneficiaryContacts.map((contact) => contact._id.toString());
    const explicitShare = item.sharedWith.find((share) =>
      beneficiaryContactIds.includes(share.contactId?.toString())
    );

    const canAccessAll = beneficiaryContacts.some((contact) => contact.canAccessAll);
    if (!explicitShare && !canAccessAll) {
      return res.status(403).json({ message: 'You do not have access to this vault item' });
    }

    let decryptedContent = item.content;
    if (item.encryptedContent) {
      try {
        decryptedContent = decrypt(JSON.parse(item.encryptedContent));
      } catch (err) {
        console.error('Decryption error for shared item:', err);
      }
    }

    const owner = await User.findById(item.userId).select('firstName lastName username');
    const ownerName = owner
      ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.username
      : 'Owner';

    item.accessLog.push({
      contactId: beneficiaryContacts[0]._id,
      accessedAt: new Date(),
      action: 'view_shared'
    });
    await item.save();

    res.json({
      item: {
        _id: item._id,
        ownerId: item.userId,
        ownerName,
        title: item.title,
        description: item.description,
        content: decryptedContent,
        type: item.type,
        category: item.category,
        tags: item.tags || [],
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
        accessLevel: explicitShare?.accessLevel || 'view',
        grantedVia: explicitShare ? 'shared-item' : 'can-access-all',
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching shared vault item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single vault item
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const vaultItem = await VaultItem.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }
    
    if (vaultItem.encryptedContent) {
      try {
        const decrypted = decrypt(JSON.parse(vaultItem.encryptedContent));
        vaultItem.content = decrypted;
      } catch (err) {
        console.error('Decryption error:', err);
      }
    }
    
    res.json(vaultItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update vault item
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const vaultItem = await VaultItem.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }
    
    if (req.body.content) {
      const encryptedData = encrypt(req.body.content);
      req.body.encryptedContent = JSON.stringify(encryptedData);
    }
    
    Object.assign(vaultItem, req.body);
    vaultItem.updatedAt = new Date();
    await vaultItem.save();
    
    res.json({
      message: 'Vault item updated',
      vaultItem
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete vault item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const vaultItem = await VaultItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }
    
    // Log activity
    await logActivity(req.userId, 'deleted_vault_item', `Deleted "${vaultItem.title}"`);

    res.json({ message: 'Vault item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share vault item with contacts
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { contactId, accessLevel } = req.body;
    
    const vaultItem = await VaultItem.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }
    
    // Check if already shared with this contact
    const existingShare = vaultItem.sharedWith.find(
      share => share.contactId.toString() === contactId
    );
    
    if (existingShare) {
      // Update access level
      existingShare.accessLevel = accessLevel;
    } else {
      // Add new share
      vaultItem.sharedWith.push({
        contactId,
        accessLevel,
        sharedAt: new Date()
      });
    }
    
    await vaultItem.save();
    res.json({ message: 'Vault item shared successfully', vaultItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove share from vault item
router.delete('/:id/share/:contactId', authMiddleware, async (req, res) => {
  try {
    const vaultItem = await VaultItem.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!vaultItem) {
      return res.status(404).json({ message: 'Vault item not found' });
    }
    
    vaultItem.sharedWith = vaultItem.sharedWith.filter(
      share => share.contactId.toString() !== req.params.contactId
    );
    
    await vaultItem.save();
    res.json({ message: 'Share removed successfully', vaultItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
