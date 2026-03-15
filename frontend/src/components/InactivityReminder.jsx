import React, { useState, useEffect } from 'react';
import { authService } from '../services';

export const InactivityReminder = () => {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(30);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await authService.getInactivityReminderSettings();
      setSettings(response.data);
      setIsEnabled(response.data.inactivityReminderEnabled);
      setReminderDays(response.data.inactivityReminderDays);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch inactivity reminder settings');
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setError('');
      setMessage('');
      setIsSaving(true);

      await authService.updateInactivityReminderSettings({
        inactivityReminderEnabled: isEnabled,
        inactivityReminderDays: reminderDays
      });

      setMessage('✅ Settings saved! You will receive reminders if you\'re inactive.');
      await fetchSettings();
      setIsSaving(false);
    } catch (err) {
      setError('Failed to update settings. Please try again.');
      setIsSaving(false);
    }
  };

  if (isLoading) return <div style={{ padding: '20px', color: '#999' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ color: '#1976d2', marginBottom: '5px' }}>⏳ Inactivity Reminders</h2>
      <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '14px' }}>
        Get notified if you haven't accessed your account for a while. This helps ensure your digital legacy is properly managed.
      </p>

      {message && (
        <div style={{
          color: '#2e7d32',
          padding: '12px 15px',
          marginBottom: '15px',
          backgroundColor: '#e8f5e9',
          border: '1px solid #81c784',
          borderRadius: '4px'
        }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{
          color: '#c62828',
          padding: '12px 15px',
          marginBottom: '15px',
          backgroundColor: '#ffebee',
          border: '1px solid #ef5350',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {/* Explanation Card */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '25px',
        borderLeft: '4px solid #2196F3'
      }}>
        <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>
          <strong>What this does:</strong> If you don't log in for several days, we'll send you an email reminder. 
          This is a good way to stay connected to your digital legacy management.
        </p>
      </div>

      {/* Main Settings */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        {/* Enable/Disable Toggle */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              style={{
                marginRight: '12px',
                width: '20px',
                height: '20px',
                cursor: 'pointer'
              }}
            />
            <div>
              <span style={{
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'block',
                color: '#333'
              }}>
                Enable inactivity reminders
              </span>
              <small style={{ color: '#999' }}>Get email notifications if you haven't logged in</small>
            </div>
          </label>
        </div>

        {/* Days Input - only show when enabled */}
        {isEnabled && (
          <div style={{
            backgroundColor: '#fafafa',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '20px',
            borderLeft: '3px solid #ff9800'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              📅 Send me a reminder after:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="1"
                max="365"
                value={reminderDays}
                onChange={(e) => setReminderDays(Math.max(1, parseInt(e.target.value) || 30))}
                style={{
                  width: '100px',
                  padding: '10px',
                  border: '2px solid #ff9800',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              />
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>days without logging in</span>
            </div>
            <small style={{ color: '#999', display: 'block', marginTop: '10px' }}>
              💡 Example: Set to 30 to get reminded if you haven't logged in for a month
            </small>
          </div>
        )}

        {/* Last Reminder Info */}
        {settings?.lastInactivityReminderSentAt && (
          <div style={{
            backgroundColor: '#e8f5e9',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '13px',
            color: '#2e7d32'
          }}>
            <strong>ℹ️ Last reminder sent:</strong> {new Date(settings.lastInactivityReminderSentAt).toLocaleDateString()} 
            at {new Date(settings.lastInactivityReminderSentAt).toLocaleTimeString()}
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              padding: '12px 30px',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              opacity: isSaving ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {isSaving ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* How it Works */}
      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '20px',
        borderRadius: '8px',
        borderLeft: '4px solid #1976d2'
      }}>
        <h3 style={{ color: '#1565c0', margin: '0 0 12px 0' }}>❓ How It Works</h3>
        <ul style={{
          margin: 0,
          paddingLeft: '20px',
          color: '#333',
          lineHeight: '1.8'
        }}>
          <li><strong>Daily checks:</strong> We check every day at 2:00 AM if you've been inactive</li>
          <li><strong>Email notification:</strong> You'll get an email reminder if you reach the inactivity threshold</li>
          <li><strong>One reminder per week:</strong> Even if you stay inactive, you'll only get reminded once per week</li>
          <li><strong>Automatic reset:</strong> Logging in resets your inactivity counter back to zero</li>
          <li><strong>Peace of mind:</strong> Helps you stay engaged with your digital legacy management</li>
        </ul>
      </div>
    </div>
  );
};
