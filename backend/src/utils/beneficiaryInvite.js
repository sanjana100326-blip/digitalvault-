import crypto from 'crypto';
import TrustedContact from '../models/TrustedContact.js';
import User from '../models/User.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sanitizeUsernameBase = (email) => {
  const rawBase = (email || 'beneficiary').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return (rawBase || 'beneficiary').slice(0, 20);
};

const generateUniqueUsername = async (email, preferredUsername) => {
  const base = (preferredUsername || sanitizeUsernameBase(email)).slice(0, 20) || 'beneficiary';
  let candidate = base;
  let suffix = 0;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    const suffixText = `${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 20 - suffixText.length))}${suffixText}`;
  }

  return candidate;
};

export const ensureBeneficiaryInviteToken = async (contact, { forceRefresh = false } = {}) => {
  if (!contact || contact.role !== 'beneficiary') {
    return null;
  }

  if (contact.isVerified && !forceRefresh) {
    return null;
  }

  const expired = !contact.verificationTokenExpires || new Date(contact.verificationTokenExpires) <= new Date();
  if (forceRefresh || !contact.verificationToken || expired) {
    contact.verificationToken = crypto.randomBytes(24).toString('hex');
    contact.verificationTokenExpires = new Date(Date.now() + INVITE_TTL_MS);
    await contact.save();
  }

  return contact.verificationToken;
};

export const getBeneficiaryInvite = async (token) => {
  if (!token) {
    return null;
  }

  const contact = await TrustedContact.findOne({
    verificationToken: token,
    role: 'beneficiary',
    verificationTokenExpires: { $gt: new Date() }
  }).populate('userId', 'firstName lastName username email');

  if (!contact) {
    return null;
  }

  const existingUser = await User.findOne({ email: contact.email }).select('email');
  const owner = contact.userId;
  const ownerName = owner
    ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.username || owner.email
    : 'Account owner';

  return {
    contact,
    ownerName,
    hasExistingAccount: Boolean(existingUser)
  };
};

export const acceptBeneficiaryInvite = async (token, { password, username, firstName, lastName } = {}) => {
  const invite = await getBeneficiaryInvite(token);
  if (!invite) {
    return null;
  }

  const { contact } = invite;
  let user = await User.findOne({ email: contact.email });

  if (!user) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const uniqueUsername = await generateUniqueUsername(contact.email, username);
    user = new User({
      username: uniqueUsername,
      email: contact.email,
      password,
      firstName: firstName || contact.name,
      lastName: lastName || ''
    });
  } else {
    if (firstName && !user.firstName) {
      user.firstName = firstName;
    }
    if (lastName && !user.lastName) {
      user.lastName = lastName;
    }
  }

  await user.save();

  contact.isVerified = true;
  contact.verificationToken = undefined;
  contact.verificationTokenExpires = undefined;
  await contact.save();

  return {
    user,
    contact,
    ownerName: invite.ownerName,
    hasExistingAccount: invite.hasExistingAccount,
    requiresLogin: invite.hasExistingAccount
  };
};

export default {
  ensureBeneficiaryInviteToken,
  getBeneficiaryInvite,
  acceptBeneficiaryInvite
};