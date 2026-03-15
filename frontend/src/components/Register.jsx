import React, { useState } from 'react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const Register = ({ onRegisterSuccess }) => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });
  const [error, setError] = useState('');
  const { isSubmitting: isLoading, runWithSubmitLock } = useSubmitLock();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const nextParam = searchParams.get('next');
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
    if (nextParam) {
      localStorage.setItem('postLoginSection', nextParam);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    await runWithSubmitLock(async () => {
      try {
        const response = await authService.register(
          formData.username,
          formData.email,
          formData.password,
          formData.firstName,
          formData.lastName
        );
        localStorage.setItem('token', response.data.token);
        onRegisterSuccess(response.data.user);
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed');
      }
    });
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '20px' }}>
        Already have an account? <a href={`/login${formData.email ? `?email=${encodeURIComponent(formData.email)}${searchParams.get('next') ? `&next=${encodeURIComponent(searchParams.get('next'))}` : ''}` : searchParams.get('next') ? `?next=${encodeURIComponent(searchParams.get('next'))}` : ''}`}>Login here</a>
      </p>
    </div>
  );
};

export default Register;
