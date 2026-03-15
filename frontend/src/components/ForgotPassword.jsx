import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const { isSubmitting, runWithSubmitLock } = useSubmitLock();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    await runWithSubmitLock(async () => {
      try {
        const response = await authService.forgotPassword(email);
        setMessage(response.data.message || 'If an account exists for that email, a password reset link has been sent.');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to send reset email');
      }
    });
  };

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', padding: '24px', border: '1px solid #dbe4ef', borderRadius: '12px', backgroundColor: '#fff' }}>
      <h2 style={{ marginTop: 0, color: '#0d47a1' }}>Forgot Password</h2>
      <p style={{ color: '#546e7a' }}>
        Enter your account email. We will send a secure password reset link.
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
          placeholder="you@example.com"
          required
          style={{ width: '100%', padding: '12px', border: '1px solid #cfd8dc', borderRadius: '8px', marginBottom: '12px', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: isSubmitting ? '#90a4ae' : '#1565c0', color: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '14px' }}>
        <a href="/login">Back to Login</a>
      </p>
    </div>
  );
};

export default ForgotPassword;
