import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import VaultManager from './components/VaultManager';
import TrustedContacts from './components/TrustedContacts';
import TriggerManager from './components/TriggerManager';
import AuditLogs from './components/AuditLogs';
import Dashboard from './components/Dashboard';
import { TwoFactorAuth } from './components/TwoFactorAuth';
import { InactivityReminder } from './components/InactivityReminder';
import { DataManagement } from './components/DataManagement';
import { HelpGuide } from './components/HelpGuide';
import { EmailTester } from './components/EmailTester';
import { BeneficiaryAccess } from './components/BeneficiaryAccess';
import { BeneficiaryInvite } from './components/BeneficiaryInvite';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { authService } from './services';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isBeneficiaryMode, setIsBeneficiaryMode] = useState(localStorage.getItem('dashboardMode') === 'beneficiary');
  const [activeSection, setActiveSection] = useState(
    localStorage.getItem('dashboardMode') === 'beneficiary' ? 'shared' : 'overview'
  );

  useEffect(() => {
    const bootstrapAuthState = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        setCurrentUser(response.data);
        setIsAuthenticated(true);
      } catch (error) {
        // Token might be stale (e.g., user deleted from DB) so clear local auth state.
        localStorage.removeItem('token');
        localStorage.removeItem('dashboardMode');
        localStorage.removeItem('postLoginSection');
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsBeneficiaryMode(false);
        setActiveSection('overview');
      }
    };

    bootstrapAuthState();
  }, []);

  const handlePostAuthNavigation = (user) => {
    const nextSection = localStorage.getItem('postLoginSection');
    const beneficiaryMode = nextSection === 'shared';

    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsBeneficiaryMode(beneficiaryMode);
    setActiveSection(beneficiaryMode ? 'shared' : nextSection || 'overview');

    if (beneficiaryMode) {
      localStorage.setItem('dashboardMode', 'beneficiary');
    } else {
      localStorage.removeItem('dashboardMode');
    }

    localStorage.removeItem('postLoginSection');
  };

  const handleLoginSuccess = (user) => {
    handlePostAuthNavigation(user);
  };

  const handleRegisterSuccess = (user) => {
    handlePostAuthNavigation(user);
  };

  const handleInviteAccepted = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsBeneficiaryMode(true);
    setActiveSection('shared');
    localStorage.setItem('dashboardMode', 'beneficiary');
    localStorage.removeItem('postLoginSection');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('dashboardMode');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsBeneficiaryMode(false);
    setActiveSection('overview');
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <header className="app-header">
          <h1>🔐 Digital Legacy Manager</h1>
          {isAuthenticated && (
            <div className="user-info">
              <span>Welcome, {currentUser?.username || 'User'}</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </header>

        <main className="app-main">
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Login onLoginSuccess={handleLoginSuccess} />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Register onRegisterSuccess={handleRegisterSuccess} />
                )
              }
            />
            <Route
              path="/forgot-password"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <ForgotPassword />
                )
              }
            />
            <Route
              path="/reset-password/:token"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <ResetPassword />
                )
              }
            />
            <Route
              path="/beneficiary-invite/:token"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <BeneficiaryInvite onInviteAccepted={handleInviteAccepted} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <div className="dashboard">
                    <nav className="dashboard-nav" style={{
                      backgroundColor: '#f5f5f5',
                      borderBottom: '1px solid #ddd',
                      padding: '10px 20px',
                      display: 'flex',
                      gap: '5px',
                      overflowX: 'auto',
                      flexWrap: 'wrap'
                    }}>
                      {!isBeneficiaryMode && (
                        <>
                          <a
                            href="#overview"
                            onClick={() => setActiveSection('overview')}
                            style={{
                              padding: '8px 15px',
                              backgroundColor: activeSection === 'overview' ? '#1976d2' : 'transparent',
                              color: activeSection === 'overview' ? 'white' : '#333',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontWeight: activeSection === 'overview' ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📊 Overview
                          </a>
                          <a
                            href="#vault"
                            onClick={() => setActiveSection('vault')}
                            style={{
                              padding: '8px 15px',
                              backgroundColor: activeSection === 'vault' ? '#1976d2' : 'transparent',
                              color: activeSection === 'vault' ? 'white' : '#333',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontWeight: activeSection === 'vault' ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🔒 Vault
                          </a>
                          <a
                            href="#contacts"
                            onClick={() => setActiveSection('contacts')}
                            style={{
                              padding: '8px 15px',
                              backgroundColor: activeSection === 'contacts' ? '#1976d2' : 'transparent',
                              color: activeSection === 'contacts' ? 'white' : '#333',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontWeight: activeSection === 'contacts' ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            👥 Contacts
                          </a>
                          <a
                            href="#triggers"
                            onClick={() => setActiveSection('triggers')}
                            style={{
                              padding: '8px 15px',
                              backgroundColor: activeSection === 'triggers' ? '#1976d2' : 'transparent',
                              color: activeSection === 'triggers' ? 'white' : '#333',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontWeight: activeSection === 'triggers' ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ⏰ Triggers
                          </a>
                          <a
                            href="#logs"
                            onClick={() => setActiveSection('logs')}
                            style={{
                              padding: '8px 15px',
                              backgroundColor: activeSection === 'logs' ? '#1976d2' : 'transparent',
                              color: activeSection === 'logs' ? 'white' : '#333',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              fontWeight: activeSection === 'logs' ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📋 Activity
                          </a>
                        </>
                      )}
                      <a
                        href="#shared"
                        onClick={() => setActiveSection('shared')}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: activeSection === 'shared' ? '#1976d2' : 'transparent',
                          color: activeSection === 'shared' ? 'white' : '#333',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: activeSection === 'shared' ? 'bold' : 'normal',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        🔓 Shared Access
                      </a>
                      <a
                        href="#help"
                        onClick={() => setActiveSection('help')}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: activeSection === 'help' ? '#1976d2' : 'transparent',
                          color: activeSection === 'help' ? 'white' : '#333',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          fontWeight: activeSection === 'help' ? 'bold' : 'normal',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ❓ Help
                      </a>
                      {!isBeneficiaryMode && (
                        <a
                          href="#settings"
                          onClick={() => setActiveSection('settings')}
                          style={{
                            padding: '8px 15px',
                            backgroundColor: activeSection === 'settings' ? '#1976d2' : 'transparent',
                            color: activeSection === 'settings' ? 'white' : '#333',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontWeight: activeSection === 'settings' ? 'bold' : 'normal',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          ⚙️ Settings
                        </a>
                      )}
                    </nav>
                    <div className="dashboard-content" style={{ padding: '20px' }}>
                      {!isBeneficiaryMode && activeSection === 'overview' && (
                        <section id="overview">
                          <Dashboard />
                        </section>
                      )}
                      {!isBeneficiaryMode && activeSection === 'vault' && (
                        <section id="vault">
                          <VaultManager />
                        </section>
                      )}
                      {!isBeneficiaryMode && activeSection === 'contacts' && (
                        <section id="contacts">
                          <TrustedContacts />
                        </section>
                      )}
                      {!isBeneficiaryMode && activeSection === 'triggers' && (
                        <section id="triggers">
                          <TriggerManager />
                        </section>
                      )}
                      {!isBeneficiaryMode && activeSection === 'logs' && (
                        <section id="logs">
                          <AuditLogs />
                        </section>
                      )}
                      {activeSection === 'shared' && (
                        <section id="shared">
                          <BeneficiaryAccess />
                        </section>
                      )}
                      {activeSection === 'help' && (
                        <section id="help">
                          <HelpGuide />
                        </section>
                      )}
                      {!isBeneficiaryMode && activeSection === 'settings' && (
                        <section id="settings">
                          <div>
                            <h2 style={{ color: '#1976d2', marginBottom: '5px' }}>⚙️ Settings</h2>
                            <p style={{ color: '#666', margin: '0 0 20px 0' }}>
                              Configure your account security and preferences
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
                                <TwoFactorAuth />
                              </div>
                              <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
                                <InactivityReminder />
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <EmailTester />
                              </div>
                              <div style={{ gridColumn: '1 / -1', border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: 'white' }}>
                                <DataManagement />
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/"
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
