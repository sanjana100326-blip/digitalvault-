import React, { useState, useEffect } from 'react';
import { authService } from '../services';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getCurrentUser();
      const activityLog = response.data.activityLog || [];
      setLogs(activityLog);
      setError('');
    } catch (err) {
      setError('Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAction = (action) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="audit-logs">
      <h2>Activity Logs</h2>
      {error && <div className="error-message">{error}</div>}
      
      {logs.length === 0 ? (
        <p>No activity logs yet</p>
      ) : (
        <div className="logs-list">
          {logs.slice().reverse().map((log, index) => (
            <div key={index} className="log-item">
              <div className="log-header">
                <span className="log-action">{formatAction(log.action)}</span>
                <span className="log-time">{formatDate(log.timestamp)}</span>
              </div>
              {log.details && <p className="log-details">{log.details}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
