import React, { useState } from 'react';
import { dataService } from '../services';

export const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [overwriteMode, setOverwriteMode] = useState(false);

  const handleExport = async (type) => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      let response;
      if (type === 'all') response = await dataService.exportAllData();
      else if (type === 'vault') response = await dataService.exportVaultItems();
      else if (type === 'activity') response = await dataService.exportActivityLog();

      // Convert to JSON and download
      const dataStr = JSON.stringify(response.data, null, 2);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dataStr));
      
      const filename = type === 'all' ? 'digital-legacy-export.json' :
                      type === 'vault' ? 'vault-items-export.json' :
                      'activity-log-export.json';
      
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      setMessage(`✓ ${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to export data');
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      const response = await dataService.createBackup();
      
      // Download backup
      const dataStr = JSON.stringify(response.data, null, 2);
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dataStr));
      element.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      setMessage('✓ Backup created and downloaded successfully!');
      setIsLoading(false);
    } catch (err) {
      setError('Failed to create backup');
      setIsLoading(false);
    }
  };

  const handleRestoreFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const backupData = JSON.parse(event.target.result);
          setRestoreFile(backupData);
          setMessage('Backup file loaded successfully');
        } catch (err) {
          setError('Invalid backup file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRestore = async () => {
    try {
      if (!restoreFile) {
        setError('Please select a backup file first');
        return;
      }

      if (!window.confirm(`Are you sure you want to restore from backup? ${overwriteMode ? 'This will overwrite your current data!' : 'Only missing items will be restored.'}`)) {
        return;
      }

      setIsLoading(true);
      setError('');
      setMessage('');

      await dataService.restoreBackup(restoreFile, overwriteMode);
      
      setMessage('✓ Backup restored successfully!');
      setRestoreFile(null);
      setOverwriteMode(false);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to restore backup: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="data-management" style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Data Management</h2>

      {message && (
        <div style={{
          color: '#4CAF50',
          padding: '12px',
          marginBottom: '15px',
          backgroundColor: '#e8f5e9',
          borderRadius: '4px',
          borderLeft: '4px solid #4CAF50'
        }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{
          color: '#f44336',
          padding: '12px',
          marginBottom: '15px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          borderLeft: '4px solid #f44336'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === 'export' ? '#2196F3' : '#f5f5f5',
            color: activeTab === 'export' ? 'white' : '#333',
            cursor: 'pointer',
            borderBottom: activeTab === 'export' ? '3px solid #1976D2' : 'none'
          }}
        >
          📥 Export Data
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === 'backup' ? '#2196F3' : '#f5f5f5',
            color: activeTab === 'backup' ? 'white' : '#333',
            cursor: 'pointer',
            borderBottom: activeTab === 'backup' ? '3px solid #1976D2' : 'none'
          }}
        >
          💾 Backup & Restore
        </button>
      </div>

      {activeTab === 'export' && (
        <div>
          <h3>Export Your Data</h3>
          <p>Download your data in JSON format for backup or migration.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div style={{
              border: '1px solid #ddd',
              padding: '20px',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}>
              <h4>All Data</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>Everything including vault, contacts, triggers, and activity</p>
              <button
                onClick={() => handleExport('all')}
                disabled={isLoading}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {isLoading ? 'Exporting...' : 'Export All'}
              </button>
            </div>

            <div style={{
              border: '1px solid #ddd',
              padding: '20px',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}>
              <h4>Vault Items</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>Only your vault items and files</p>
              <button
                onClick={() => handleExport('vault')}
                disabled={isLoading}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {isLoading ? 'Exporting...' : 'Export Vault'}
              </button>
            </div>

            <div style={{
              border: '1px solid #ddd',
              padding: '20px',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }} onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}>
              <h4>Activity Log</h4>
              <p style={{ color: '#666', fontSize: '14px' }}>Your activity history and audit trail</p>
              <button
                onClick={() => handleExport('activity')}
                disabled={isLoading}
                style={{
                  backgroundColor: '#FF9800',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {isLoading ? 'Exporting...' : 'Export Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div>
          <h3>Backup & Restore</h3>
          <p>Create backups of your data and restore from previous backups.</p>

          <div style={{ marginBottom: '30px' }}>
            <h4>📦 Create Backup</h4>
            <p style={{ color: '#666' }}>Download a complete backup of all your data</p>
            <button
              onClick={handleBackup}
              disabled={isLoading}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              {isLoading ? 'Creating Backup...' : '💾 Create Backup'}
            </button>
          </div>

          <div style={{ 
            backgroundColor: '#f5f5f5',
            padding: '20px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <h4>♻️ Restore Backup</h4>
            <p style={{ color: '#666' }}>Upload a backup file to restore your data</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFileChange}
                  style={{ marginBottom: '10px' }}
                />
                <small style={{ color: '#999' }}>Select a .json backup file</small>
              </label>
            </div>

            {restoreFile && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    checked={overwriteMode}
                    onChange={(e) => setOverwriteMode(e.target.checked)}
                    style={{ marginRight: '10px' }}
                  />
                  <span>
                    Overwrite Mode
                    <small style={{ display: 'block', color: '#999' }}>
                      {overwriteMode 
                        ? '⚠️ WARNING: This will delete your current data and replace it with the backup'
                        : 'Default: Only restore missing items'}
                    </small>
                  </span>
                </label>

                <button
                  onClick={handleRestore}
                  disabled={isLoading}
                  style={{
                    backgroundColor: overwriteMode ? '#f44336' : '#2196F3',
                    color: 'white',
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginRight: '10px'
                  }}
                >
                  {isLoading ? 'Restoring...' : '♻️ Restore Backup'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
