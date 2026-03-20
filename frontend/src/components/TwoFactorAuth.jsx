import React, { useState, useEffect } from 'react';
import { authService } from '../services';

export const TwoFactorAuth = () => {
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [regenPassword, setRegenPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTwoFAStatus();
  }, []);

  const fetchTwoFAStatus = async () => {
    try {
      const response = await authService.getTwoFAStatus();
      setTwoFAStatus(response.data);
      setIsLoading(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch 2FA status');
      setIsLoading(false);
    }
  };

  const handleSetupStart = async () => {
    try {
      setError('');
      setMessage('');
      const response = await authService.setupTwoFA();
      setSetupData(response.data);
      setShowSetup(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to setup 2FA');
    }
  };

  const handleVerify = async () => {
    try {
      if (!verificationToken) {
        setError('Please enter the verification token');
        return;
      }

      const response = await authService.verifyTwoFA(setupData.secret, verificationToken);
      setBackupCodes(response.data.backupCodes);
      setMessage('2FA enabled successfully! Save your backup codes.');
      setShowSetup(false);
      setVerificationToken('');
      await fetchTwoFAStatus();
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid token. Please try again.');
    }
  };

  const handleDisable = async () => {
    try {
      if (!disablePassword) {
        setError('Please enter your password');
        return;
      }

      await authService.disableTwoFA(disablePassword);
      setMessage('2FA disabled successfully');
      setDisablePassword('');
      await fetchTwoFAStatus();
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid password or failed to disable 2FA');
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      if (!regenPassword) {
        setError('Please enter your password');
        return;
      }

      const response = await authService.regenerateBackupCodes(regenPassword);
      setBackupCodes(response.data.backupCodes);
      setMessage('Backup codes regenerated successfully');
      setRegenPassword('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid password or failed to regenerate codes');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="two-factor-auth" style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Two-Factor Authentication</h2>

      {message && <div style={{ color: '#4CAF50', padding: '10px', marginBottom: '15px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>{message}</div>}
      {error && <div style={{ color: '#f44336', padding: '10px', marginBottom: '15px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
        <h3>Status: {twoFAStatus?.twoFactorEnabled ? '✓ Enabled' : '✗ Disabled'}</h3>
        {twoFAStatus?.twoFactorEnabled && (
          <p>Backup codes remaining: {twoFAStatus.backupCodesRemaining}</p>
        )}
      </div>

      {!twoFAStatus?.twoFactorEnabled ? (
        <div>
          <p>Enable two-factor authentication to add an extra layer of security to your account.</p>
          <button
            onClick={handleSetupStart}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Enable 2FA
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h3>Regenerate Backup Codes</h3>
            <input
              type="password"
              placeholder="Enter your password"
              value={regenPassword}
              onChange={(e) => setRegenPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <button
              onClick={handleRegenerateCodes}
              style={{
                backgroundColor: '#FF9800',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Regenerate Codes
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Disable 2FA</h3>
            <input
              type="password"
              placeholder="Enter your password to disable"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <button
              onClick={handleDisable}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Disable 2FA
            </button>
          </div>
        </div>
      )}

      {showSetup && setupData && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: '1000'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3>Setup Two-Factor Authentication</h3>

            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p>1. Scan this QR code with your authenticator app:</p>
              <img src={setupData.qrCode} alt="QR Code" style={{ maxWidth: '300px' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p>2. Or enter this secret key manually:</p>
              <code style={{
                backgroundColor: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                display: 'block',
                wordBreak: 'break-all'
              }}>
                {setupData.secret}
              </code>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p>3. Enter the 6-digit code from your authenticator app:</p>
              <input
                type="text"
                maxLength="6"
                placeholder="000000"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '24px',
                  textAlign: 'center',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleVerify}
                style={{
                  flex: 1,
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Verify & Enable
              </button>
              <button
                onClick={() => {
                  setShowSetup(false);
                  setVerificationToken('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#ccc',
                  color: '#333',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {backupCodes && (
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '15px',
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          <h3>⚠️ Save Your Backup Codes</h3>
          <p>Keep these codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
          <div style={{
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            overflowY: 'auto',
            maxHeight: '200px',
            marginBottom: '10px'
          }}>
            {backupCodes.map((code, index) => (
              <div key={index}>{code}</div>
            ))}
          </div>
          <button
            onClick={() => {
              const text = backupCodes.join('\n');
              const element = document.createElement('a');
              element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
              element.setAttribute('download', 'backup-codes.txt');
              element.style.display = 'none';
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Download Backup Codes
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;
