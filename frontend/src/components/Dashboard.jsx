import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
      setError('');
    } catch (err) {
      const apiMessage = err.response?.data?.message || err.response?.data?.error;
      setError(apiMessage || 'Failed to load dashboard statistics');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!stats) return null;

  const { overview, vaultByType, vaultByCategory, recentActivity } = stats;

  return (
    <div className="dashboard-analytics">
      <h2>Dashboard Analytics</h2>

      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{overview.totalVaultItems}</h3>
            <p>Total Vault Items</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{overview.totalContacts}</h3>
            <p>Trusted Contacts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-info">
            <h3>{overview.activeTriggers}/{overview.totalTriggers}</h3>
            <p>Active Triggers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-info">
            <h3>{formatBytes(overview.totalStorage)}</h3>
            <p>Storage Used</p>
          </div>
        </div>
      </div>

      {/* Vault by Type */}
      <div className="chart-section">
        <h3>Vault Items by Type</h3>
        <div className="chart-bars">
          {Object.entries(vaultByType).map(([type, count]) => (
            <div key={type} className="chart-bar-item">
              <span className="bar-label">{type}</span>
              <div className="bar-container">
                <div 
                  className="bar-fill" 
                  style={{ width: `${(count / overview.totalVaultItems) * 100}%` }}
                ></div>
                <span className="bar-count">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vault by Category */}
      {Object.keys(vaultByCategory).length > 0 && (
        <div className="chart-section">
          <h3>Vault Items by Category</h3>
          <div className="chart-bars">
            {Object.entries(vaultByCategory).map(([category, count]) => (
              <div key={category} className="chart-bar-item">
                <span className="bar-label">{category}</span>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{ width: `${(count / overview.totalVaultItems) * 100}%` }}
                  ></div>
                  <span className="bar-count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
