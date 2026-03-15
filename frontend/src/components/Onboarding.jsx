import React, { useState, useEffect } from 'react';
import { authService } from '../services';

export const Onboarding = ({ onComplete, user }) => {
  const [step, setStep] = useState(1);
  const [setupData, setSetupData] = useState({
    vaultCreated: false,
    contactAdded: false,
    triggerCreated: false,
    twoFAEnabled: false
  });

  const steps = [
    {
      number: 1,
      title: '🔒 Secure Your Account',
      description: 'Set up Two-Factor Authentication for maximum security',
      action: 'Go to Settings',
      icon: '🔐'
    },
    {
      number: 2,
      title: '📦 Create Your First Vault Item',
      description: 'Store important documents, notes, or credentials safely',
      action: 'Go to Vault',
      icon: '🗂️'
    },
    {
      number: 3,
      title: '👥 Add Trusted Contacts',
      description: 'Designate beneficiaries who will inherit your digital assets',
      action: 'Go to Contacts',
      icon: '👨‍👩‍👧‍👦'
    },
    {
      number: 4,
      title: '⏰ Create an Access Trigger',
      description: 'Automatically grant access based on time or inactivity',
      action: 'Go to Triggers',
      icon: '⚡'
    }
  ];

  const currentStep = steps[step - 1];
  const completedCount = Object.values(setupData).filter(Boolean).length;
  const progress = (completedCount / 4) * 100;

  return (
    <div style={{
      backgroundColor: '#f0f7ff',
      borderRadius: '12px',
      padding: '30px',
      marginBottom: '30px',
      border: '2px solid #2196F3'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1565c0' }}>👋 Welcome to Digital Legacy Manager, {user?.firstName || 'User'}!</h2>
        <button
          onClick={onComplete}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Skip Tour
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#666', marginBottom: '10px', fontSize: '14px' }}>
          Setup Progress: {completedCount} of 4 steps completed
        </p>
        <div style={{
          backgroundColor: '#e0e0e0',
          height: '8px',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#4CAF50',
            height: '100%',
            width: `${progress}%`,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '60px', marginBottom: '15px' }}>{currentStep.icon}</div>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#1976d2' }}>
            {currentStep.title}
          </h3>
          <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '16px' }}>
            {currentStep.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
          {steps.map((s) => (
            <button
              key={s.number}
              onClick={() => setStep(s.number)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: step >= s.number ? '#4CAF50' : '#e0e0e0',
                color: step >= s.number ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {s.number}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            style={{
              padding: '10px 20px',
              backgroundColor: step === 1 ? '#ccc' : '#757575',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: step === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ← Previous
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Next →
            </button>
          )}
          {step === 4 && (
            <button
              onClick={onComplete}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Get Started! ✓
            </button>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        backgroundColor: '#e8f5e9',
        padding: '15px',
        borderRadius: '8px',
        borderLeft: '4px solid #4CAF50'
      }}>
        <p style={{ margin: 0, color: '#2e7d32', fontSize: '14px' }}>
          <strong>💡 Tip:</strong> Each section has helpful descriptions. Take your time to explore!
        </p>
      </div>
    </div>
  );
};
