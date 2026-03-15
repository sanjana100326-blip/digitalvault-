import React, { useState } from 'react';

export const HelpGuide = () => {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    {
      id: 'vault',
      title: '📦 Vault: Store Your Digital Assets',
      icon: '🗂️',
      description: 'Create a secure digital vault for storing important files and information',
      content: `
        <h4>What you can store:</h4>
        <ul>
          <li><strong>Notes</strong> - Passwords, codes, private messages</li>
          <li><strong>Documents</strong> - PDFs, Word docs, important files</li>
          <li><strong>Media</strong> - Photos, videos important to you</li>
          <li><strong>Credentials</strong> - Login info, recovery codes</li>
        </ul>
        <h4>How to use:</h4>
        <ol>
          <li>Click "Add New Item"</li>
          <li>Fill in title, description, and content</li>
          <li>Choose the type (Note, Document, Media, or Credential)</li>
          <li>Click "Save Item"</li>
        </ol>
        <p><strong>💡 Tip:</strong> All content is encrypted and only you can access it initially.</p>
      `
    },
    {
      id: 'contacts',
      title: '👥 Contacts: Choose Your Beneficiaries',
      icon: '👨‍👩‍👧‍👦',
      description: 'Add trusted people who will care for your digital legacy',
      content: `
        <h4>Role types:</h4>
        <ul>
          <li><strong>Beneficiary</strong> - Will inherit your vault items</li>
          <li><strong>Executor</strong> - Can manage your assets on your behalf</li>
          <li><strong>Advisor</strong> - Can provide guidance</li>
        </ul>
        <h4>How to add:</h4>
        <ol>
          <li>Go to Contacts tab</li>
          <li>Click "Add New Contact"</li>
          <li>Enter their name, email, and role</li>
          <li>They'll be notified via email</li>
        </ol>
        <p><strong>💡 Tip:</strong> Choose people you truly trust with your important digital assets.</p>
      `
    },
    {
      id: 'triggers',
      title: '⏰ Triggers: Automatic Access Control',
      icon: '⚡',
      description: 'Set conditions for when your loved ones get access to your vault',
      content: `
        <h4>Three trigger types:</h4>
        <ul>
          <li><strong>Time-Based</strong> - Grant access on a specific date/time (e.g., after 30 years)</li>
          <li><strong>Date Range</strong> - Grant access between two dates (e.g., holiday season)</li>
          <li><strong>Inactivity-Based</strong> - Grant access if you don't login for X days</li>
        </ul>
        <h4>Quick setup:</h4>
        <ol>
          <li>Go to Triggers</li>
          <li>Click "Create Trigger"</li>
          <li>Choose type and set conditions</li>
          <li>Add beneficiaries to notify</li>
          <li>Turn on "Auto-execute" to activate automatically</li>
        </ol>
        <p><strong>💡 Best Practice:</strong> Start simple - use one time-based trigger first.</p>
      `
    },
    {
      id: '2fa',
      title: '🔐 2FA: Protect Your Account',
      icon: '🔒',
      description: 'Enable two-factor authentication to keep your account super secure',
      content: `
        <h4>How it works:</h4>
        <ol>
          <li>Go to Settings → Two-Factor Authentication</li>
          <li>Click "Enable 2FA"</li>
          <li>Scan the QR code with your phone (Google Authenticator, Authy, Microsoft Authenticator)</li>
          <li>Enter the 6-digit code from your phone</li>
          <li><strong>Save your 10 backup codes</strong> in a safe place</li>
        </ol>
        <h4>After 2FA is enabled:</h4>
        <ul>
          <li>Every login requires your password + code from your phone</li>
          <li>If you lose your phone, use a backup code instead</li>
          <li>Much harder for hackers to break in</li>
        </ul>
        <p><strong>💡 Important:</strong> Save backup codes somewhere safe!</p>
      `
    },
    {
      id: 'bulk',
      title: '📋 Bulk Operations: Manage Multiple Items',
      icon: '✓✓✓',
      description: 'Work with multiple vault items at once',
      content: `
        <h4>What you can do:</h4>
        <ul>
          <li><strong>Select Multiple Items</strong> - Click checkboxes next to items</li>
          <li><strong>Bulk Share</strong> - Share 5 items with someone in seconds</li>
          <li><strong>Bulk Delete</strong> - Remove multiple items at once</li>
          <li><strong>Drag & Drop Upload</strong> - Add multiple files instantly</li>
        </ul>
        <h4>How to bulk share:</h4>
        <ol>
          <li>In Vault, check the items you want to share</li>
          <li>Select a contact from the dropdown</li>
          <li>Choose access level (View or View & Download)</li>
          <li>Click "Share Selected"</li>
        </ol>
        <p><strong>💡 Tip:</strong> Drag files directly onto the page to upload them!</p>
      `
    }
  ];

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h2 style={{ color: '#1976d2', marginBottom: '10px' }}>📚 Help & Guides</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Click on any section below to learn how to use Digital Legacy Manager
      </p>

      {sections.map(section => (
        <div
          key={section.id}
          style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginBottom: '15px',
            overflow: 'hidden'
          }}
        >
          <div
            onClick={() => toggleExpand(section.id)}
            style={{
              padding: '20px',
              backgroundColor: expanded[section.id] ? '#f5f5f5' : '#fafafa',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'background-color 0.3s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: '32px' }}>{section.icon}</div>
              <div>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1976d2' }}>
                  {section.title}
                </h3>
                <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
                  {section.description}
                </p>
              </div>
            </div>
            <div style={{ fontSize: '20px', color: '#999' }}>
              {expanded[section.id] ? '▼' : '▶'}
            </div>
          </div>

          {expanded[section.id] && (
            <div
              style={{
                padding: '20px',
                backgroundColor: '#f9f9f9',
                borderTop: '1px solid #eee'
              }}
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          )}
        </div>
      ))}

      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '30px',
        borderLeft: '4px solid #2196F3'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>❓ Quick FAQs</h3>
        <div style={{ color: '#555', lineHeight: '1.8' }}>
          <p><strong>Q: Is my data encrypted?</strong><br/>
          A: Yes! Everything in your vault is encrypted with military-grade AES-256-GCM encryption.</p>
          
          <p><strong>Q: What happens if I forget my password?</strong><br/>
          A: You'll need to reset it via email. Make sure your email is recoverable!</p>
          
          <p><strong>Q: Can I change my mind about triggers?</strong><br/>
          A: Yes! You can delete or edit triggers anytime before they activate.</p>
          
          <p><strong>Q: How do beneficiaries access the vault?</strong><br/>
          A: They'll receive an email with a create-account or login link. They must use the same email address that received the message, then open Shared Access after login.</p>
        </div>
      </div>
    </div>
  );
};
