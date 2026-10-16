import React, { useState } from 'react';
import { Shield, User, LogOut, ChevronDown } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isConnected, currentUser, onLogout }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'assess', label: 'Risk Assessment' },
    { id: 'what-if', label: 'What-If Simulation' },
    { id: 'models', label: 'Model Evaluation' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'history', label: 'History' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: '#09090b',
      borderBottom: '1px solid #27272a',
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '54px'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '5px',
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={13} color="#f4f4f5" />
          </div>
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f4f4f5', letterSpacing: '-0.01em' }}>
            Risk DSS
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#f4f4f5' : '#a1a1aa',
                  backgroundColor: isActive ? '#18181b' : 'transparent',
                  border: isActive ? '1px solid #27272a' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Status + Authenticated User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#71717a' }}>
            <div style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444'
            }} />
            <span>{isConnected ? 'Connected' : 'Connecting'}</span>
          </div>

          {currentUser && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  color: '#f4f4f5',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#27272a',
                  fontSize: '9px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f4f4f5'
                }}>
                  {currentUser.avatarInitials || 'AN'}
                </div>
                <span style={{ fontWeight: 500 }}>{currentUser.name || 'Analyst'}</span>
                <ChevronDown size={11} color="#71717a" />
              </button>

              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '32px',
                  width: '200px',
                  backgroundColor: '#121215',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  zIndex: 100
                }}>
                  <div style={{ padding: '6px 8px', borderBottom: '1px solid #1f1f23', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#f4f4f5' }}>{currentUser.name}</div>
                    <div style={{ fontSize: '10px', color: '#71717a' }}>{currentUser.role}</div>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={12} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
