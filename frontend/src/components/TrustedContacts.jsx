import React, { useState, useEffect } from 'react';
import { contactService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const TrustedContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isSubmitting, runWithSubmitLock } = useSubmitLock();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    relationship: '',
    phone: '',
    role: 'beneficiary',
    canAccessAll: false,
    sendEmail: true
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const response = await contactService.getAllContacts();
      setContacts(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runWithSubmitLock(async () => {
      try {
        const response = await contactService.createContact(formData);
        setNotification({
          type: 'success',
          title: 'Contact Added',
          message: `${formData.name} has been added as a ${formData.role}`,
          emailStatus: response.data?.email?.success
            ? `Email sent (ID: ${response.data?.email?.messageId})`
            : 'Email not sent',
          details: response.data?.email
        });
        setFormData({
          name: '',
          email: '',
          relationship: '',
          phone: '',
          role: 'beneficiary',
          canAccessAll: false,
          sendEmail: true
        });
        setShowForm(false);
        await loadContacts();
      } catch (err) {
        setNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to create contact: ' + (err.response?.data?.message || err.message)
        });
      }
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await contactService.deleteContact(id);
        loadContacts();
      } catch (err) {
        setError('Failed to delete contact');
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="trusted-contacts">
      <h2>Trusted Contacts</h2>
      {error && <div className="error-message">{error}</div>}

      {notification && (
        <div
          style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '4px',
            backgroundColor: notification.type === 'success' ? '#e8f5e9' : '#ffebee',
            border: `1px solid ${notification.type === 'success' ? '#4caf50' : '#f44336'}`,
            color: notification.type === 'success' ? '#2e7d32' : '#c62828'
          }}
        >
          <h4 style={{ margin: '0 0 8px 0' }}>{notification.title}</h4>
          <p style={{ margin: '0 0 8px 0' }}>{notification.message}</p>
          {notification.emailStatus && (
            <p style={{ margin: '5px 0', fontSize: '13px' }}>
              <strong>Email Status:</strong> {notification.emailStatus}
            </p>
          )}
          {notification.details && !notification.details.success && (
            <p style={{ margin: '5px 0', fontSize: '12px', color: 'inherit' }}>
              <strong>Reason:</strong> {notification.details.message}
            </p>
          )}
          <button
            onClick={() => setNotification(null)}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: 'transparent',
              border: `1px solid ${notification.type === 'success' ? '#4caf50' : '#f44336'}`,
              color: 'inherit',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <button onClick={() => setShowForm(!showForm)} disabled={isSubmitting}>
        {showForm ? 'Cancel' : 'Add Contact'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="contact-form">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
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
            name="relationship"
            placeholder="Relationship"
            value={formData.relationship}
            onChange={handleChange}
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone"
            value={formData.phone}
            onChange={handleChange}
          />
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="beneficiary">Beneficiary</option>
            <option value="executor">Executor</option>
            <option value="advisor">Advisor</option>
          </select>
          <label>
            <input
              type="checkbox"
              name="canAccessAll"
              checked={formData.canAccessAll}
              onChange={handleChange}
            />
            Can Access All Items
          </label>
          <label>
            <input
              type="checkbox"
              name="sendEmail"
              checked={formData.sendEmail}
              onChange={handleChange}
            />
            Send Email Notification to Beneficiary
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Contact...' : 'Save Contact'}
          </button>
        </form>
      )}

      <div className="contacts-list">
        {contacts.map((contact) => (
          <div key={contact._id} className="contact-item">
            <h3>{contact.name}</h3>
            <p>Email: {contact.email}</p>
            <p>
              Role: <strong>{contact.role}</strong>
            </p>
            <p>Relationship: {contact.relationship}</p>
            <button onClick={() => handleDelete(contact._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustedContacts;
