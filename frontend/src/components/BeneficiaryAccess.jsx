import React, { useEffect, useState } from 'react';
import { vaultService } from '../services';

export const BeneficiaryAccess = () => {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const message = localStorage.getItem('beneficiaryWelcomeMessage');
    if (message) {
      setSuccessMessage(message);
      localStorage.removeItem('beneficiaryWelcomeMessage');
    }
  }, []);

  const loadSharedItems = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await vaultService.getSharedItems();
      setItems(response.data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shared vault items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSharedItems();
  }, []);

  const handleOpenItem = async (id) => {
    try {
      setIsLoadingDetails(true);
      setError('');
      const response = await vaultService.getSharedItem(id);
      setSelectedItem(response.data.item);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open shared item');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getDownloadUrl = (item) => {
    if (!item?.fileName || !item?.content) {
      return null;
    }
    const mimeType = item.mimeType || 'application/octet-stream';
    return `data:${mimeType};base64,${item.content}`;
  };

  const isImageFile = (item) => {
    return Boolean(item?.mimeType && item.mimeType.startsWith('image/'));
  };

  const isTextLikeFile = (item) => {
    return Boolean(item?.mimeType && (item.mimeType.startsWith('text/') || item.mimeType.includes('json')));
  };

  const decodeBase64Text = (value) => {
    try {
      return atob(value);
    } catch {
      return null;
    }
  };

  return (
    <div style={{
      background: 'radial-gradient(circle at 0% 0%, #e3f2fd 0%, #f7fbff 40%, #ffffff 100%)',
      border: '1px solid #d5e4ff',
      borderRadius: '16px',
      padding: '20px'
    }}>
      <h2 style={{ color: '#0d47a1', marginBottom: '8px' }}>Shared Access</h2>
      <p style={{ color: '#455a64', marginTop: 0 }}>
        This section shows vault items shared with your account once an owner trigger is activated.
      </p>

      {successMessage && (
        <div style={{
          backgroundColor: '#e8f5e9',
          color: '#1b5e20',
          border: '1px solid #66bb6a',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', border: '1px solid #f44336', padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <p>Loading shared items...</p>
      ) : items.length === 0 ? (
        <div style={{ border: '1px dashed #90a4ae', borderRadius: '10px', padding: '18px', backgroundColor: '#f9fcff' }}>
          <strong>No shared items yet.</strong>
          <p style={{ marginBottom: 0, color: '#555' }}>
            You will see items here after an owner adds you as beneficiary, shares vault items or enables full access, and activates a trigger.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(320px, 1.3fr)', gap: '20px' }}>
          <div style={{ border: '1px solid #dbe4ef', borderRadius: '10px', backgroundColor: '#fff' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #edf2f7', fontWeight: 'bold', color: '#15304b' }}>
              Shared Items ({items.length})
            </div>
            <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
              {items.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleOpenItem(item._id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: '1px solid #edf2f7',
                    backgroundColor: selectedItem?._id === item._id ? '#eaf4ff' : '#fff',
                    padding: '12px 16px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ color: '#555', fontSize: '13px', marginTop: '4px' }}>
                    Owner: {item.ownerName} | Access: {item.accessLevel}
                  </div>
                  <div style={{ color: '#777', fontSize: '12px', marginTop: '4px' }}>
                    Type: {item.type} | Category: {item.category || 'N/A'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #dbe4ef', borderRadius: '10px', backgroundColor: '#fff', padding: '16px' }}>
            {!selectedItem ? (
              <p style={{ color: '#666', margin: 0 }}>Select an item to view details.</p>
            ) : isLoadingDetails ? (
              <p>Loading item details...</p>
            ) : (
              <div>
                <h3 style={{ marginTop: 0 }}>{selectedItem.title}</h3>
                <p style={{ marginTop: 0, color: '#555' }}>
                  Owner: <strong>{selectedItem.ownerName}</strong>
                </p>
                <p style={{ color: '#555' }}>
                  Access Level: <strong>{selectedItem.accessLevel}</strong>
                </p>
                {selectedItem.description && (
                  <p><strong>Description:</strong> {selectedItem.description}</p>
                )}
                <p><strong>Type:</strong> {selectedItem.type}</p>
                <p><strong>Category:</strong> {selectedItem.category || 'N/A'}</p>
                {selectedItem.fileName && (
                  <p><strong>File:</strong> {selectedItem.fileName}</p>
                )}
                {selectedItem.fileName ? (
                  <div>
                    <strong>File Access:</strong>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {getDownloadUrl(selectedItem) && (
                        <a
                          href={getDownloadUrl(selectedItem)}
                          download={selectedItem.fileName}
                          style={{
                            display: 'inline-block',
                            padding: '9px 14px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            backgroundColor: '#1565c0',
                            color: 'white',
                            fontWeight: 600
                          }}
                        >
                          Download File
                        </a>
                      )}
                    </div>

                    {isImageFile(selectedItem) && getDownloadUrl(selectedItem) && (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 600, color: '#1f3f5b' }}>Preview</div>
                        <img
                          src={getDownloadUrl(selectedItem)}
                          alt={selectedItem.fileName}
                          style={{ maxWidth: '100%', border: '1px solid #dbe4ef', borderRadius: '8px' }}
                        />
                      </div>
                    )}

                    {isTextLikeFile(selectedItem) && selectedItem.content && (
                      <div style={{ marginTop: '14px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 600, color: '#1f3f5b' }}>Text Preview</div>
                        <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8fbff', border: '1px solid #e3ebf4', borderRadius: '6px', padding: '12px', marginTop: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                          {decodeBase64Text(selectedItem.content) || 'Unable to decode file preview. Use Download File.'}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <strong>Content:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f8fbff', border: '1px solid #e3ebf4', borderRadius: '6px', padding: '12px', marginTop: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                      {selectedItem.content || '(No content)'}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BeneficiaryAccess;
