import React, { useState, useEffect } from 'react';
import { triggerService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const TriggerManager = () => {
  const [triggers, setTriggers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isSubmitting, runWithSubmitLock } = useSubmitLock();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'time-based',
    inactivityDays: 30,
    triggerDate: '',
    startDate: '',
    endDate: '',
    triggerTime: '00:00',
    webhookUrl: '',
    webhookEnabled: false,
    notificationEmails: '',
    notificationMessage: '',
    autoExecute: true
  });

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    try {
      setIsLoading(true);
      const response = await triggerService.getAllTriggers();
      setTriggers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load triggers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runWithSubmitLock(async () => {
      try {
        setError('');

        const submitData = {
          ...formData,
          notificationEmails: formData.notificationEmails
            ? formData.notificationEmails.split(',').map((email) => email.trim()).filter(Boolean)
            : []
        };

        await triggerService.createTrigger(submitData);
        setFormData({
          name: '',
          description: '',
          triggerType: 'time-based',
          inactivityDays: 30,
          triggerDate: '',
          startDate: '',
          endDate: '',
          triggerTime: '00:00',
          webhookUrl: '',
          webhookEnabled: false,
          notificationEmails: '',
          notificationMessage: '',
          autoExecute: true
        });
        setShowForm(false);
        setShowAdvanced(false);
        await loadTriggers();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to create trigger');
      }
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await triggerService.deleteTrigger(id);
        loadTriggers();
      } catch (err) {
        setError('Failed to delete trigger');
      }
    }
  };

  const handleActivate = async (id) => {
    try {
      const response = await triggerService.activateTrigger(id);
      if (response.data.success) {
        alert('Trigger activated! Notifications have been sent.');
      } else {
        alert('Trigger conditions not met yet.');
      }
      loadTriggers();
    } catch (err) {
      alert('Failed to activate trigger');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="trigger-manager" style={{ padding: '20px' }}>
      <h2>⏰ Access Triggers</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Automatically grant access to your vault based on specific dates or inactivity. Get notified when triggers activate.
      </p>
      {error && <div style={{ color: '#f44336', padding: '10px', marginBottom: '15px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
      
      <button 
        onClick={() => setShowForm(!showForm)}
        disabled={isSubmitting}
        style={{
          backgroundColor: '#2196F3',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {showForm ? 'Cancel' : '➕ Create Trigger'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#f9f9f9',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #ddd'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Trigger Name *</label>
            <input
              type="text"
              name="name"
              placeholder="e.g., 30-Year Legacy Access"
              value={formData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea
              name="description"
              placeholder="What is the purpose of this trigger?"
              value={formData.description}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Trigger Type *</label>
            <select 
              name="triggerType" 
              value={formData.triggerType} 
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="inactivity-based">Inactivity-Based (Days Since Last Login)</option>
              <option value="time-based">Time-Based (Specific Date & Time)</option>
              <option value="date-range">Date Range (Between Two Dates)</option>
            </select>
          </div>
          
          {formData.triggerType === 'inactivity-based' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Days of Inactivity *</label>
              <input
                type="number"
                name="inactivityDays"
                placeholder="e.g., 365"
                value={formData.inactivityDays}
                onChange={handleChange}
                min="1"
                max="3650"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ color: '#666' }}>Trigger will activate after this many days without login</small>
            </div>
          )}
          
          {formData.triggerType === 'time-based' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Date & Time *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>Date</label>
                  <input
                    type="date"
                    name="triggerDate"
                    value={formData.triggerDate}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>Time</label>
                  <input
                    type="time"
                    name="triggerTime"
                    value={formData.triggerTime}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.triggerType === 'date-range' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Date Range *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required={formData.triggerType === 'date-range'}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required={formData.triggerType === 'date-range'}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>Trigger will be active between these dates</small>
            </div>
          )}

          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setShowAdvanced(!showAdvanced)}>
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={() => setShowAdvanced(!showAdvanced)}
              style={{ marginRight: '10px' }}
            />
            <label style={{ fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Advanced Settings (Webhooks & Notifications)</label>
          </div>

          {showAdvanced && (
            <div style={{
              backgroundColor: '#f0f0f0',
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '15px',
              border: '1px solid #ccc'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Notification Emails (comma-separated)</label>
                <input
                  type="text"
                  name="notificationEmails"
                  placeholder="e.g., john@example.com, jane@example.com"
                  value={formData.notificationEmails}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#666' }}>Additional people to notify when trigger activates</small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Custom Notification Message</label>
                <textarea
                  name="notificationMessage"
                  placeholder="Custom message to include in notifications..."
                  value={formData.notificationMessage}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                    minHeight: '60px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="webhookEnabled"
                    checked={formData.webhookEnabled}
                    onChange={handleChange}
                    style={{ marginRight: '10px' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>Enable Webhook</span>
                </label>
                {formData.webhookEnabled && (
                  <input
                    type="url"
                    name="webhookUrl"
                    placeholder="https://example.com/webhook"
                    value={formData.webhookUrl}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
                <small style={{ color: '#666' }}>Trigger event will be POSTed to this URL</small>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    name="autoExecute"
                    checked={formData.autoExecute}
                    onChange={handleChange}
                    style={{ marginRight: '10px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Auto-execute when conditions are met</span>
                </label>
                <small style={{ color: '#666' }}>If unchecked, trigger must be manually activated</small>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? '#9e9e9e' : '#4CAF50',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            {isSubmitting ? 'Creating Trigger...' : 'Create Trigger'}
          </button>
        </form>
      )}

      <div className="triggers-list">
        {triggers.length === 0 ? (
          <p style={{ color: '#999', padding: '20px', textAlign: 'center' }}>No triggers created yet</p>
        ) : (
          triggers.map(trigger => (
            <div 
              key={trigger._id} 
              className="trigger-item"
              style={{
                backgroundColor: trigger.isTriggered ? '#c8e6c9' : '#f5f5f5',
                borderLeft: trigger.isTriggered ? '5px solid #4CAF50' : '5px solid #2196F3',
                padding: '15px',
                marginBottom: '15px',
                borderRadius: '4px',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', color: trigger.isTriggered ? '#2e7d32' : '#1976d2' }}>
                    {trigger.name}
                    {trigger.isTriggered && <span style={{ marginLeft: '10px', color: '#4CAF50', fontSize: '14px', fontWeight: 'bold' }}>✓ TRIGGERED</span>}
                  </h3>
                  <p style={{ margin: '4px 0', color: '#666' }}>{trigger.description}</p>
                  <p style={{ margin: '4px 0', fontWeight: '500' }}>Type: {trigger.triggerType.replace('-', ' ')}</p>
                  
                  {trigger.triggerType === 'inactivity-based' && (
                    <p style={{ margin: '4px 0' }}>Inactivity: {trigger.inactivityDays} days</p>
                  )}
                  {trigger.triggerType === 'time-based' && (
                    <div style={{ margin: '4px 0' }}>
                      <p style={{ margin: '2px 0' }}>📅 {new Date(trigger.triggerDate).toLocaleDateString()} at {trigger.triggerTime}</p>
                    </div>
                  )}
                  {trigger.triggerType === 'date-range' && (
                    <div style={{ margin: '4px 0' }}>
                      <p style={{ margin: '2px 0' }}>📅 {new Date(trigger.startDate).toLocaleDateString()} to {new Date(trigger.endDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  
                  <p style={{ margin: '4px 0', color: trigger.isActive ? '#4CAF50' : '#f44336' }}>
                    Status: {trigger.isActive ? '✓ Active' : '✗ Inactive'}
                  </p>
                  {trigger.webhookEnabled && (
                    <p style={{ margin: '4px 0', color: '#FF9800', fontSize: '12px' }}>🔗 Webhook enabled</p>
                  )}
                  {trigger.notificationEmails?.length > 0 && (
                    <p style={{ margin: '4px 0', color: '#FF9800', fontSize: '12px' }}>📧 {trigger.notificationEmails.length} additional recipients</p>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!trigger.isTriggered && trigger.isActive && (
                  <button 
                    onClick={() => handleActivate(trigger._id)} 
                    style={{
                      backgroundColor: '#4CAF50', 
                      color: 'white', 
                      cursor: 'pointer', 
                      padding: '8px 16px', 
                      border: 'none', 
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}
                  >
                    Activate
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(trigger._id)}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TriggerManager;
