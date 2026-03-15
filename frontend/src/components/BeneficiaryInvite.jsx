import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const BeneficiaryInvite = ({ onInviteAccepted }) => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { isSubmitting, runWithSubmitLock } = useSubmitLock();
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInvite = async () => {
      try {
        setIsLoading(true);
        const response = await authService.getBeneficiaryInvite(token);
        setInvite(response.data);
        localStorage.setItem('postLoginSection', 'shared');
      } catch (err) {
        setError(err.response?.data?.message || 'Invite is invalid or expired');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!invite?.hasExistingAccount && password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!invite?.hasExistingAccount && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    await runWithSubmitLock(async () => {
      try {
        setError('');
        setSuccessMessage('');
        const response = await authService.acceptBeneficiaryInvite(token, {
          password,
          firstName,
          lastName
        });
        const ownerDisplayName = invite?.ownerName || 'the account owner';

        if (response.data.requiresLogin) {
          setSuccessMessage(`Beneficiary access verified for ${ownerDisplayName}. Redirecting you to login...`);
          localStorage.setItem(
            'beneficiaryWelcomeMessage',
            `Beneficiary access verified for ${ownerDisplayName}. Sign in to view any shared items after the trigger is activated.`
          );
          window.setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1200);
          return;
        }

        setSuccessMessage(`Beneficiary access activated successfully. Redirecting you to shared access for ${ownerDisplayName}...`);
        localStorage.setItem(
          'beneficiaryWelcomeMessage',
          `Account activated successfully. You can now access shared vault items from ${invite.ownerName}.`
        );
        localStorage.setItem('token', response.data.token);
        onInviteAccepted(response.data.user);
        window.setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1200);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to activate beneficiary access');
      }
    });
  };

  if (isLoading) {
    return <div style={{ maxWidth: '540px', margin: '40px auto', padding: '20px' }}>Loading invite...</div>;
  }

  if (error && !invite) {
    return (
      <div style={{ maxWidth: '540px', margin: '40px auto', padding: '24px', border: '1px solid #f44336', borderRadius: '8px', backgroundColor: '#ffebee' }}>
        <h2 style={{ marginTop: 0 }}>Invite unavailable</h2>
        <p style={{ marginBottom: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '620px',
      margin: '40px auto',
      padding: '28px',
      border: '1px solid #d9e6ff',
      borderRadius: '16px',
      background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)',
      boxShadow: '0 14px 32px rgba(8, 37, 74, 0.08)'
    }}>
      <h2 style={{ marginTop: 0, color: '#0d47a1', marginBottom: '10px' }}>Activate Beneficiary Access</h2>
      <p style={{ color: '#555', marginTop: 0 }}>
        {invite.ownerName} has invited you to access shared digital legacy items.
      </p>
      <p style={{ color: '#0f2a43', marginBottom: '8px' }}>
        Linked email: <strong>{invite.beneficiaryEmail}</strong>
      </p>
      <p style={{ color: '#555', marginTop: 0 }}>
        {invite.hasExistingAccount
          ? 'This email already has an account. Confirm the invite and sign in with your existing password. The invite link cannot reset your password.'
          : 'Create your password below to activate your beneficiary account.'}
      </p>

      {error && (
        <div style={{ color: '#c62828', backgroundColor: '#ffebee', borderRadius: '6px', padding: '10px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={{ color: '#1b5e20', backgroundColor: '#e8f5e9', borderRadius: '6px', padding: '12px', marginBottom: '16px', border: '1px solid #66bb6a' }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="First Name (optional)"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #cfd8dc', borderRadius: '8px', boxSizing: 'border-box' }}
        />
        <input
          type="text"
          placeholder="Last Name (optional)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #cfd8dc', borderRadius: '8px', boxSizing: 'border-box' }}
        />
        {!invite.hasExistingAccount && (
          <>
            <input
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #cfd8dc', borderRadius: '8px', boxSizing: 'border-box' }}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #cfd8dc', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isSubmitting ? '#90a4ae' : '#1565c0',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 600
          }}
        >
          {isSubmitting ? 'Activating Access...' : successMessage ? 'Access Activated' : invite.hasExistingAccount ? 'Verify Invite and Continue to Login' : 'Activate Beneficiary Access'}
        </button>
        {isSubmitting && (
          <p style={{ margin: '12px 0 0', color: '#546e7a', fontSize: '14px' }}>
            {invite.hasExistingAccount
              ? 'Please wait. Your beneficiary invite is being verified.'
              : 'Please wait. Your password is being saved and your beneficiary access is being activated.'}
          </p>
        )}
      </form>
    </div>
  );
};

export default BeneficiaryInvite;
