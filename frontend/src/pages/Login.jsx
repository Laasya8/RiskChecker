import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('demo_user@riskplatform.io');
  const [password, setPassword] = useState('demo_password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (!email.trim() || !password.trim()) {
        setError('Please provide your work email and password.');
        setLoading(false);
        return;
      }

      // Generalized user session
      const displayName = email.includes('demo_user') 
        ? 'Demo User' 
        : email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      const user = {
        name: displayName,
        email: email.trim(),
        role: email.includes('admin') || email.includes('lead') ? 'Senior Risk Analyst' : 'Risk Analyst',
        avatarInitials: displayName.slice(0, 2).toUpperCase()
      };

      if (rememberMe) {
        localStorage.setItem('risk_dss_user', JSON.stringify(user));
      }
      onLogin(user);
      setLoading(false);
    }, 300);
  };

  const handleQuickDemo = () => {
    setEmail('demo_user@riskplatform.io');
    setPassword('demo_password123');
    setError(null);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      backgroundColor: '#09090b',
      color: '#f4f4f5'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            marginBottom: '12px'
          }}>
            <Shield size={18} color="#f4f4f5" />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', color: '#f4f4f5' }}>
            Risk Intelligence Platform
          </h1>
          <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '2px' }}>
            Sign in to access your risk assessment workspace
          </p>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor: '#121214',
          border: '1px solid #27272a',
          borderRadius: '10px',
          padding: '24px'
        }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              color: '#f87171',
              marginBottom: '16px'
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#a1a1aa', marginBottom: '6px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo_user@riskplatform.io"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
                    color: '#f4f4f5',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <Mail size={13} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: '#a1a1aa' }}>
                  Password
                </label>
                <span style={{ fontSize: '11px', color: '#71717a' }}>Demo Mode</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
                    color: '#f4f4f5',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <Lock size={13} color="#71717a" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#a1a1aa' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#ffffff' }}
                />
                Remember me
              </label>
              <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={11} /> Enterprise SSO
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '9px',
                marginTop: '4px',
                fontWeight: 500,
                fontSize: '13px'
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #27272a' }}>
            <button
              type="button"
              onClick={handleQuickDemo}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '5px',
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                color: '#a1a1aa',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              Autofill Demo Account (demo_user)
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '11px', color: '#71717a' }}>
          Decision Support System &bull; Risk Assessment Platform
        </div>
      </div>
    </div>
  );
}
