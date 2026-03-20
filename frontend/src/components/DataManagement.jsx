import React, { useState } from 'react';
import { dataService } from '../services';

export const DataManagement = () => {
  const [activeTab, setActiveTab] = useState('export');
  const [exportFormat, setExportFormat] = useState('json');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [overwriteMode, setOverwriteMode] = useState(false);

  const resolveErrorMessage = (err, fallback) => (
    err?.response?.data?.message || err?.message || fallback
  );

  const getExportTitle = (type) => (
    type === 'all' ? 'Digital Legacy Export' :
    type === 'vault' ? 'Vault Items Export' :
    'Activity Log Export'
  );

  const getExportFilename = (type, format) => {
    const date = new Date().toISOString().split('T')[0];
    const base = type === 'all'
      ? 'digital-legacy-export'
      : type === 'vault'
        ? 'vault-items-export'
        : 'activity-log-export';

    if (format === 'pdf') return `${base}-${date}.pdf`;
    if (format === 'doc') return `${base}-${date}.doc`;
    return `${base}-${date}.json`;
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  };

  const exportAsJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    triggerDownload(blob, filename);
  };

  const exportAsDoc = (title, data, filename) => {
    const prettyJson = JSON.stringify(data, null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>${title}</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <pre style="white-space: pre-wrap; word-wrap: break-word; border: 1px solid #ddd; padding: 12px;">${prettyJson}</pre>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    triggerDownload(blob, filename);
  };

  const exportAsPdf = async (title, data, filename) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const maxWidth = 515;
    const lineHeight = 14;
    let y = margin;

    doc.setFontSize(16);
    doc.text(title, margin, y);
    y += 22;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 20;

    doc.setFontSize(9);
    const lines = doc.splitTextToSize(JSON.stringify(data, null, 2), maxWidth);
    lines.forEach((line) => {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save(filename);
  };

  const downloadExport = async (type, data) => {
    const title = getExportTitle(type);
    const filename = getExportFilename(type, exportFormat);

    if (exportFormat === 'pdf') {
      await exportAsPdf(title, data, filename);
      return;
    }

    if (exportFormat === 'doc') {
      exportAsDoc(title, data, filename);
      return;
    }

    exportAsJson(data, filename);
  };

  const handleExport = async (type) => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      let response;
      if (type === 'all') response = await dataService.exportAllData();
      else if (type === 'vault') response = await dataService.exportVaultItems();
      else if (type === 'activity') response = await dataService.exportActivityLog();

      await downloadExport(type, response.data);

      setMessage(`✓ ${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully as ${exportFormat.toUpperCase()}!`);
    } catch (err) {
      setError(resolveErrorMessage(err, 'Failed to export data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      const response = await dataService.createBackup();

      exportAsJson(response.data, `backup-${new Date().toISOString().split('T')[0]}.json`);

      setMessage('✓ Backup created and downloaded successfully!');
    } catch (err) {
      setError(resolveErrorMessage(err, 'Failed to create backup'));
    } finally {
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
    } catch (err) {
      setError(`Failed to restore backup: ${resolveErrorMessage(err, 'Unknown error')}`);
    } finally {
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
          <p>Download your data in JSON, PDF, or Word format for backup, sharing, or review.</p>

          <div style={{ marginBottom: '20px', maxWidth: '280px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Export format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#fff'
              }}
            >
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
              <option value="doc">Word (.doc)</option>
            </select>
          </div>

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
