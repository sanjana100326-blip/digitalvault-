import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const EmailTester = () => {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendTestEmail = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/test/test-email`,
        { testEmail: testEmail || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResult({
        success: true,
        message: response.data.message,
        details: response.data.details
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Failed to send test email',
        error: error.response?.data?.error || error.message,
        config: error.response?.data?.config
      });
    } finally {
      setLoading(false);
    }
  };

  const sendBeneficiaryTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/test/test-beneficiary-email`,
        { 
          beneficiaryEmail: testEmail,
          beneficiaryName: 'Test Beneficiary'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResult({
        success: true,
        message: 'Beneficiary test email sent successfully',
        details: response.data
      });
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Failed to send beneficiary test email',
        error: error.response?.data?.error || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
      <h3 style={{ color: '#1976d2', marginTop: 0 }}>📧 Email Testing</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Test your SMTP email configuration to ensure beneficiaries will receive access notifications.
      </p>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Test Email Address (leave blank to send to yourself):
        </label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="beneficiary@example.com"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
        <button
          onClick={sendTestEmail}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Sending...' : 'Send Test Email'}
        </button>

        <button
          onClick={sendBeneficiaryTestEmail}
          disabled={loading || !testEmail}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (loading || !testEmail) ? 'not-allowed' : 'pointer',
            opacity: (loading || !testEmail) ? 0.6 : 1
          }}
        >
          {loading ? 'Sending...' : 'Send Beneficiary Test'}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: result.success ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${result.success ? '#4caf50' : '#f44336'}`,
            borderRadius: '4px'
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: result.success ? '#2e7d32' : '#c62828' }}>
            {result.success ? '✅ Success' : '❌ Failed'}
          </h4>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Message:</strong> {result.message}
          </p>
          
          {result.details && (
            <div style={{ marginTop: '10px', fontSize: '13px' }}>
              <strong>Details:</strong>
              <pre style={{ 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                padding: '10px', 
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          )}

          {result.error && (
            <p style={{ margin: '5px 0', fontSize: '13px', color: '#d32f2f' }}>
              <strong>Error:</strong> {result.error}
            </p>
          )}

          {result.config && (
            <div style={{ marginTop: '10px', fontSize: '13px' }}>
              <strong>SMTP Configuration:</strong>
              <pre style={{ 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {JSON.stringify(result.config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '13px' }}>
        <strong>⚠️ Troubleshooting:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Verify SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVICE are set in backend/.env</li>
          <li>For Gmail, use an App Password (not your regular password)</li>
          <li>Check backend console logs for detailed error messages</li>
          <li>Ensure backend server is running and connected to database</li>
        </ul>
      </div>
    </div>
  );
};

export default EmailTester;
