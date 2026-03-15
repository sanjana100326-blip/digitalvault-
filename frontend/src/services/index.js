import apiClient from './api';

export const authService = {
  register: (username, email, password, firstName, lastName) =>
    apiClient.post('/auth/register', { username, email, password, firstName, lastName }),
  
  login: (email, password, twoFactorToken) =>
    apiClient.post('/auth/login', { email, password, twoFactorToken }),

  forgotPassword: (email) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token, email, password) =>
    apiClient.post(`/auth/reset-password/${token}`, { email, password }),
  
  getCurrentUser: () =>
    apiClient.get('/auth/me'),
  
  logout: () => {
    localStorage.removeItem('token');
  },

  // 2FA Methods
  setupTwoFA: () =>
    apiClient.post('/auth/2fa/setup', {}),
  
  verifyTwoFA: (secret, token) =>
    apiClient.post('/auth/2fa/verify', { secret, token }),
  
  disableTwoFA: (password) =>
    apiClient.post('/auth/2fa/disable', { password }),
  
  getTwoFAStatus: () =>
    apiClient.get('/auth/2fa/status'),
  
  regenerateBackupCodes: (password) =>
    apiClient.post('/auth/2fa/regenerate-codes', { password }),
  
  // Inactivity Reminder Methods
  getInactivityReminderSettings: () =>
    apiClient.get('/auth/inactivity-reminder/settings'),
  
  updateInactivityReminderSettings: (settings) =>
    apiClient.put('/auth/inactivity-reminder/settings', settings),

  getBeneficiaryInvite: (token) =>
    apiClient.get(`/auth/beneficiary-invite/${token}`),

  acceptBeneficiaryInvite: (token, payload) =>
    apiClient.post(`/auth/beneficiary-invite/${token}/accept`, payload)
};

export const vaultService = {
  getAllItems: (params) =>
    apiClient.get(`/vault${params ? `?${params}` : ''}`),

  getSharedItems: () =>
    apiClient.get('/vault/shared/me'),

  getSharedItem: (id) =>
    apiClient.get(`/vault/shared/me/${id}`),
  
  getItem: (id) =>
    apiClient.get(`/vault/${id}`),
  
  createItem: (data) => {
    const config = data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
    return apiClient.post('/vault', data, config);
  },
  
  updateItem: (id, data) =>
    apiClient.put(`/vault/${id}`, data),
  
  deleteItem: (id) =>
    apiClient.delete(`/vault/${id}`),
  
  shareItem: (id, contactId, accessLevel) =>
    apiClient.post(`/vault/${id}/share`, { contactId, accessLevel }),
  
  removeShare: (id, contactId) =>
    apiClient.delete(`/vault/${id}/share/${contactId}`)
};

export const contactService = {
  getAllContacts: () =>
    apiClient.get('/contacts'),
  
  createContact: (data) =>
    apiClient.post('/contacts', data),
  
  updateContact: (id, data) =>
    apiClient.put(`/contacts/${id}`, data),
  
  deleteContact: (id) =>
    apiClient.delete(`/contacts/${id}`)
};

export const triggerService = {
  getAllTriggers: () =>
    apiClient.get('/triggers'),
  
  createTrigger: (data) =>
    apiClient.post('/triggers', data),
  
  updateTrigger: (id, data) =>
    apiClient.put(`/triggers/${id}`, data),
  
  deleteTrigger: (id) =>
    apiClient.delete(`/triggers/${id}`),
  
  activateTrigger: (id) =>
    apiClient.post(`/triggers/${id}/activate`, {})
};

// Data Export Service
export const dataService = {
  exportAllData: () =>
    apiClient.get('/data/export/data'),
  
  exportVaultItems: () =>
    apiClient.get('/data/export/vault'),
  
  exportActivityLog: () =>
    apiClient.get('/data/export/activity-log'),
  
  createBackup: () =>
    apiClient.post('/data/backup', {}),
  
  restoreBackup: (backupData, overwrite = false) =>
    apiClient.post('/data/restore', { backupData, overwrite })
};
