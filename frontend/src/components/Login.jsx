import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const Login = ({ onLoginSuccess }) => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [error, setError] = useState('');
  const { isSubmitting: isLoading, runWithSubmitLock } = useSubmitLock();
  const [requires2FA, setRequires2FA] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const nextParam = searchParams.get('next');
    if (emailParam) {
      setEmail(emailParam);
    }
    if (nextParam) {
      localStorage.setItem('postLoginSection', nextParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    await runWithSubmitLock(async () => {
      try {
        const response = await authService.login(email, password, requires2FA ? twoFactorToken : null);
        localStorage.setItem('token', response.data.token);
        onLoginSuccess(response.data.user);
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.requires2FA) {
          setRequires2FA(true);
          setError('');
        } else {
          setError(err.response?.data?.message || 'Login failed');
        }
      }
    });
  };

  return (
    <div className="login-container" style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2>Login</h2>
      {error && <div style={{ color: '#f44336', padding: '10px', marginBottom: '15px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {!requires2FA ? (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: '10px' }}>
              Enter the 6-digit code from your authenticator app or use a backup code:
            </p>
            <input
              type="text"
              placeholder="000000"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '5px'
              }}
              autoFocus
            />
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          {isLoading ? (requires2FA ? 'Verifying...' : 'Logging in...') : (requires2FA ? 'Verify 2FA' : 'Login')}
        </button>

        {requires2FA && (
          <button
            type="button"
            onClick={() => {
              setRequires2FA(false);
              setTwoFactorToken('');
            }}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '10px',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Back to Login
          </button>
        )}
      </form>

      {!requires2FA && (
        <p style={{ textAlign: 'right', marginTop: '10px', marginBottom: '0' }}>
          <a href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}>Forgot password?</a>
        </p>
      )}

      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Don't have an account? <a href={`/register${email ? `?email=${encodeURIComponent(email)}${searchParams.get('next') ? `&next=${encodeURIComponent(searchParams.get('next'))}` : ''}` : searchParams.get('next') ? `?next=${encodeURIComponent(searchParams.get('next'))}` : ''}`}>Register here</a>
      </p>
    </div>
  );
};

export default Login;
