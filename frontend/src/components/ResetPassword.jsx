import React, { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const ResetPassword = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isSubmitting, runWithSubmitLock } = useSubmitLock();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    await runWithSubmitLock(async () => {
      try {
        const response = await authService.resetPassword(token, email, password);
        setMessage(response.data.message || 'Password reset successful. You can now login.');
        setPassword('');
        setConfirmPassword('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to reset password');
      }
    });
  };

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto', padding: '24px', border: '1px solid #dbe4ef', borderRadius: '12px', backgroundColor: '#fff' }}>
      <h2 style={{ marginTop: 0, color: '#0d47a1' }}>Reset Password</h2>
      <p style={{ color: '#546e7a' }}>
        Set your new password for this account.
      </p>

      {message && (
        <div style={{ backgroundColor: '#e8f5e9', color: '#1b5e20', border: '1px solid #66bb6a', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#ffebee', color: '#b71c1c', border: '1px solid #ef9a9a', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Account email"
          required
          style={{ width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          required
          style={{ width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          style={{ width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', marginBottom: '12px', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: isSubmitting ? '#90a4ae' : '#1565c0', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
        >
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '14px' }}>
        <a href="/login">Go to Login</a>
      </p>
    </div>
  );
};

export default ResetPassword;
