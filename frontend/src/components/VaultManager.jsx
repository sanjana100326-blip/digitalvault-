import React, { useState, useEffect } from 'react';
import { vaultService, contactService } from '../services';
import { useSubmitLock } from '../hooks/useSubmitLock';

export const VaultManager = () => {
  const [vaultItems, setVaultItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isSubmitting: isCreatingItem, runWithSubmitLock: runCreateSubmitLock } = useSubmitLock();
  const { isSubmitting: isSharingItem, runWithSubmitLock: runShareSubmitLock } = useSubmitLock();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareFormData, setShareFormData] = useState({ contactId: '', accessLevel: 'view' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkShareContact, setBulkShareContact] = useState('');
  const [bulkShareAccessLevel, setBulkShareAccessLevel] = useState('view');
  const [dragOverlay, setDragOverlay] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [showHelpTip, setShowHelpTip] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    type: 'note',
    category: '',
    tags: ''
  });

  useEffect(() => {
    loadVaultItems();
    loadContacts();
  }, [pagination.page, searchTerm, filterType, filterCategory]);

  const loadContacts = async () => {
    try {
      const response = await contactService.getAllContacts();
      setContacts(response.data);
    } catch (err) {
      console.error('Failed to load contacts');
    }
  };

  const loadVaultItems = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterType) params.append('type', filterType);
      if (filterCategory) params.append('category', filterCategory);
      
      const response = await vaultService.getAllItems(params.toString());
      setVaultItems(response.data.items || response.data);
      setPagination(response.data.pagination || pagination);
      setError('');
    } catch (err) {
      setError('Failed to load vault items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'type' && (value === 'document' || value === 'media')) {
      setFormData(prev => ({ ...prev, content: '' }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    setFile(selectedFile || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await runCreateSubmitLock(async () => {
      try {
        setError('');

        if (file) {
          const payload = new FormData();
          payload.append('title', formData.title);
          payload.append('description', formData.description);
          payload.append('type', formData.type);
          payload.append('category', formData.category);
          payload.append('tags', formData.tags);
          payload.append('file', file);
          await vaultService.createItem(payload);
        } else {
          await vaultService.createItem({
            ...formData,
            tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
          });
        }

        setFormData({
          title: '',
          description: '',
          content: '',
          type: 'note',
          category: '',
          tags: ''
        });
        setFile(null);
        setShowForm(false);
        await loadVaultItems();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to create vault item');
      }
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await vaultService.deleteItem(id);
        loadVaultItems();
      } catch (err) {
        setError('Failed to delete item');
      }
    }
  };

  const handleShare = (item) => {
    setActiveItem(item);
    setShowShareModal(true);
    setShareFormData({ contactId: '', accessLevel: 'view' });
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    await runShareSubmitLock(async () => {
      try {
        await vaultService.shareItem(activeItem._id, shareFormData.contactId, shareFormData.accessLevel);
        setShowShareModal(false);
        await loadVaultItems();
        alert('Vault item shared successfully');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to share item');
      }
    });
  };

  const handleRemoveShare = async (contactId) => {
    if (window.confirm('Remove access for this contact?')) {
      try {
        await vaultService.removeShare(activeItem._id, contactId);
        loadVaultItems();
        handleView(activeItem._id);
      } catch (err) {
        alert('Failed to remove share');
      }
    }
  };

  // Bulk Operations
  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === vaultItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(vaultItems.map(item => item._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      alert('No items selected');
      return;
    }
    
    if (window.confirm(`Delete ${selectedItems.size} selected items? This cannot be undone.`)) {
      try {
        for (const itemId of selectedItems) {
          await vaultService.deleteItem(itemId);
        }
        setSelectedItems(new Set());
        loadVaultItems();
        alert(`${selectedItems.size} items deleted successfully`);
      } catch (err) {
        setError('Failed to delete some items');
      }
    }
  };

  const handleBulkShare = async () => {
    if (selectedItems.size === 0) {
      alert('No items selected');
      return;
    }
    
    if (!bulkShareContact) {
      alert('Please select a contact');
      return;
    }

    try {
      let sharedCount = 0;
      for (const itemId of selectedItems) {
        try {
          await vaultService.shareItem(itemId, bulkShareContact, bulkShareAccessLevel);
          sharedCount++;
        } catch (err) {
          console.error(`Failed to share item ${itemId}:`, err);
        }
      }
      
      setSelectedItems(new Set());
      setBulkShareContact('');
      loadVaultItems();
      alert(`Shared ${sharedCount} items with selected contact`);
    } catch (err) {
      setError('Failed to share some items');
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setDragOverlay(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setDragOverlay(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverlay(false);
    setDragCounter(0);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      try {
        let uploadedCount = 0;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const payload = new FormData();
          payload.append('title', file.name.split('.')[0]);
          payload.append('description', `Uploaded via drag and drop`);
          payload.append('type', file.type.startsWith('image/') ? 'media' : file.type.startsWith('video/') ? 'media' : 'document');
          payload.append('category', 'Bulk Upload');
          payload.append('tags', 'bulk-upload');
          payload.append('file', file);
          
          try {
            await vaultService.createItem(payload);
            uploadedCount++;
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
          }
        }
        
        loadVaultItems();
        alert(`${uploadedCount} file(s) uploaded successfully`);
      } catch (err) {
        setError('Failed to upload files');
      }
    }
  };

  const handleView = async (id) => {
    try {
      const response = await vaultService.getItem(id);
      setActiveItem(response.data);
      setViewerError('');
      setShowViewer(true);
    } catch (err) {
      setViewerError('Failed to load vault item');
    }
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setActiveItem(null);
  };

  const handleDownload = () => {
    if (!activeItem?.content || !activeItem?.fileName) return;
    const byteCharacters = atob(activeItem.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: activeItem.mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeItem.fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const renderFilePreview = () => {
    if (!activeItem?.fileName || !activeItem?.mimeType) return null;
    
    if (activeItem.mimeType.startsWith('image/')) {
      const blob = new Blob([new Uint8Array(atob(activeItem.content).split('').map(c => c.charCodeAt(0)))], 
        { type: activeItem.mimeType });
      const url = URL.createObjectURL(blob);
      return <img src={url} alt={activeItem.fileName} style={{ maxWidth: '100%', borderRadius: '8px' }} />;
    }
    
    if (activeItem.mimeType.startsWith('video/')) {
      const blob = new Blob([new Uint8Array(atob(activeItem.content).split('').map(c => c.charCodeAt(0)))], 
        { type: activeItem.mimeType });
      const url = URL.createObjectURL(blob);
      return <video controls style={{ maxWidth: '100%', borderRadius: '8px' }}><source src={url} type={activeItem.mimeType} /></video>;
    }
    
    return null;
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="vault-manager">
      <h2 style={{ color: '#1976d2', marginBottom: '5px' }}>🔒 Digital Vault</h2>
      <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '14px' }}>
        Securely store documents, passwords, photos, and important information. Everything is encrypted.
      </p>
      {error && <div className="error-message">{error}</div>}
      
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          flex: 1,
          minWidth: '300px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder="🔍 Search vault items by name..."
            value={searchTerm}
            onChange={handleSearch}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            className="search-input"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="note">📄 Notes</option>
            <option value="document">📦 Documents</option>
            <option value="media">🖼️ Media</option>
            <option value="credential">🔑 Credentials</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={isCreatingItem}
          style={{
            padding: '10px 20px',
            backgroundColor: showForm ? '#f0f0f0' : '#1976d2',
            color: showForm ? '#333' : 'white',
            border: '1px solid ' + (showForm ? '#ddd' : '#1976d2'),
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add New Item'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="vault-form" style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0, color: '#1976d2' }}>📝 Add New Item to Your Vault</h3>
          
          {showHelpTip && (
            <div style={{
              backgroundColor: '#fff3e0',
              border: '1px solid #ffb74d',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#e65100', fontSize: '14px' }}>
                💡 Store passwords, documents, notes, and important files securely
              </span>
              <button
                type="button"
                onClick={() => setShowHelpTip(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  fontSize: '18px'
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Type Selection */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
              What are you storing? *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            >
              <option value="note">📄 Note (plain text, passwords, codes)</option>
              <option value="credential">🔑 Credential (login info, usernames)</option>
              <option value="document">📦 Document (PDF, Word, files)</option>
              <option value="media">🖼️ Media (photos, videos)</option>
            </select>
            <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
              Choose what type of item you're saving
            </small>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
              Name or Title *
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g., 'Gmail Password', 'Bank Account', 'Family Photos'"
              value={formData.title}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
              Give this item a clear, memorable name
            </small>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
              Description (optional)
            </label>
            <textarea
              name="description"
              placeholder="e.g., 'Main email account', 'House documents', 'Childhood memories'"
              value={formData.description}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                minHeight: '60px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
            <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
              Add notes about what this is for
            </small>
          </div>

          {/* Content or File */}
          <div style={{ marginBottom: '15px' }}>
            {(formData.type === 'document' || formData.type === 'media') ? (
              <>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                  Upload File *
                </label>
                <input
                  type="file"
                  name="file"
                  onChange={handleFileChange}
                  accept="*/*"
                  required
                  style={{
                    padding: '10px',
                    border: '2px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    width: '100%',
                    customFileUploadLabel: 'Choose file'
                  }}
                />
                <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
                  {formData.type === 'document' ? 'Upload PDFs, Word docs, spreadsheets' : 'Upload photos, videos, or images'}
                </small>
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                  Content *
                </label>
                <textarea
                  name="content"
                  placeholder={formData.type === 'credential' ? 'e.g., Username: john@example.com\nPassword: ***' : 'Your text content here...'}
                  value={formData.content}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    minHeight: '100px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
                <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
                  {formData.type === 'credential' ? '🔒 Content is encrypted and never shared unless you choose to' : 'Your content is encrypted and secure'}
                </small>
              </>
            )}
          </div>

          {/* Optional fields in collapsible section */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
              Optional Details
            </label>
            <input
              type="text"
              name="category"
              placeholder="e.g., 'Passwords', 'Financial', 'Legal' (optional)"
              value={formData.category}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
            />
            <input
              type="text"
              name="tags"
              placeholder="e.g., 'important, financial' (comma separated, optional)"
              value={formData.tags}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isCreatingItem}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingItem}
              style={{
                padding: '10px 25px',
                backgroundColor: isCreatingItem ? '#90a4ae' : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isCreatingItem ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              {isCreatingItem ? 'Saving Item...' : 'Save Item 🔒'}
            </button>
          </div>
        </form>
      )}

      {/* Drag and Drop Overlay */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ position: 'relative' }}
      >
        {dragOverlay && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            border: '3px dashed #2196F3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#2196F3', margin: '0' }}>
                📁 Drop files here to upload
              </p>
              <p style={{ color: '#666', margin: '5px 0 0 0' }}>Multiple files supported for batch upload</p>
            </div>
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedItems.size > 0 && (
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #2196F3',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#1976d2' }}>
              {selectedItems.size} item(s) selected
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={bulkShareContact}
                onChange={(e) => setBulkShareContact(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="">Select contact to share...</option>
                {contacts.map(contact => (
                  <option key={contact._id} value={contact._id}>
                    {contact.name}
                  </option>
                ))}
              </select>
              
              <select
                value={bulkShareAccessLevel}
                onChange={(e) => setBulkShareAccessLevel(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="view">View Only</option>
                <option value="download">View & Download</option>
              </select>

              <button
                onClick={handleBulkShare}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Share Selected
              </button>

              <button
                onClick={handleBulkDelete}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Delete {selectedItems.size}
              </button>

              <button
                onClick={() => setSelectedItems(new Set())}
                style={{
                  backgroundColor: '#999',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Select All Checkbox */}
        {vaultItems.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedItems.size === vaultItems.length && vaultItems.length > 0}
                onChange={handleSelectAll}
                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 'bold' }}>
                Select All {pagination.total > 0 ? `(${vaultItems.length} on this page)` : ''}
              </span>
            </label>
          </div>
        )}

      <div className="vault-items">
        {vaultItems.map(item => (
          <div 
            key={item._id} 
            className="vault-item"
            style={{
              backgroundColor: selectedItems.has(item._id) ? '#f0f7ff' : 'white',
              border: selectedItems.has(item._id) ? '2px solid #2196F3' : '1px solid #ddd',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
              <input
                type="checkbox"
                checked={selectedItems.has(item._id)}
                onChange={() => handleSelectItem(item._id)}
                style={{
                  marginTop: '5px',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{item.title}</h3>
                <p style={{ margin: '4px 0', color: '#666' }}>{item.description}</p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#999' }}>
                  Type: {item.type} | Category: {item.category}
                </p>
                {item.tags && item.tags.length > 0 && (
                  <div className="tags" style={{ marginTop: '8px' }}>
                    {item.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="tag"
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#f0f0f0',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          marginRight: '5px',
                          fontSize: '12px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="item-actions" style={{ display: 'flex', gap: '5px' }}>
                <button 
                  onClick={() => handleView(item._id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  View
                </button>
                <button 
                  onClick={() => handleShare(item)} 
                  className="secondary"
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#FF9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Share
                </button>
                <button 
                  onClick={() => handleDelete(item._id)} 
                  className="danger"
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
      {/* End of drag-and-drop wrapper */}

      {pagination.pages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(pagination.page - 1)} 
            disabled={pagination.page === 1}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button 
            onClick={() => handlePageChange(pagination.page + 1)} 
            disabled={pagination.page === pagination.pages}
          >
            Next
          </button>
        </div>
      )}

      {showViewer && activeItem && (
        <div className="modal-overlay" onClick={handleCloseViewer}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeItem.title}</h3>
              <button onClick={handleCloseViewer} className="ghost">Close</button>
            </div>
            {viewerError && <div className="error-message">{viewerError}</div>}
            <p className="meta">Type: {activeItem.type}</p>
            {activeItem.description && <p>{activeItem.description}</p>}
            {activeItem.fileName ? (
              <div className="file-block">
                <p><strong>File:</strong> {activeItem.fileName}</p>
                {renderFilePreview()}
                <button onClick={handleDownload}>Download</button>
              </div>
            ) : (
              <pre className="content-preview">{activeItem.content}</pre>
            )}
            
            {/* Shared With Section */}
            {activeItem.sharedWith && activeItem.sharedWith.length > 0 && (
              <div className="shared-with-section">
                <h4>Shared With:</h4>
                {activeItem.sharedWith.map(share => {
                  const contact = contacts.find(c => c._id === share.contactId);
                  return (
                    <div key={share.contactId} className="shared-contact">
                      <span>{contact?.name || 'Unknown'} ({share.accessLevel})</span>
                      <button onClick={() => handleRemoveShare(share.contactId)} className="danger-small">Remove</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && activeItem && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share "{activeItem.title}"</h3>
              <button onClick={() => setShowShareModal(false)} className="ghost">Close</button>
            </div>
            <form onSubmit={handleShareSubmit} className="share-form">
              <label>
                Select Contact:
                <select 
                  value={shareFormData.contactId} 
                  onChange={(e) => setShareFormData({ ...shareFormData, contactId: e.target.value })}
                  required
                >
                  <option value="">-- Select Contact --</option>
                  {contacts.map(contact => (
                    <option key={contact._id} value={contact._id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </label>
              
              <label>
                Access Level:
                <select 
                  value={shareFormData.accessLevel} 
                  onChange={(e) => setShareFormData({ ...shareFormData, accessLevel: e.target.value })}
                >
                  <option value="view">View Only</option>
                  <option value="download">View & Download</option>
                </select>
              </label>
              
              <button type="submit" disabled={isSharingItem}>
                {isSharingItem ? 'Sharing...' : 'Share'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultManager;
