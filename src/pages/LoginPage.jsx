import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function LoginPage() {
  const { login } = useApp();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;

    setIsLoggingIn(true);
    setLoginError('');
    try {
      await login(loginUsername, loginPassword);
    } catch (err) {
      setLoginError(err.message || 'Username atau password salah!');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = async (username, password) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await login(username, password);
    } catch (err) {
      setLoginError(err.message || 'Gagal masuk menggunakan akun demo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="logo-section" style={{ justifyContent: 'center' }}>
          <div className="logo-icon">
            <Layers size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="logo-title" style={{ fontSize: '1.6rem' }}>Media Promo ST</h1>
            <div className="logo-subtitle">Sistem Hak Akses Wilayah (RBAC)</div>
          </div>
        </div>

        <h3 style={{ textAlign: 'center', color: 'white', fontWeight: '500', margin: 0, fontSize: '1.1rem' }}>Silakan Masuk</h3>

        {loginError && (
          <div style={{
            background: 'rgba(244,63,94,0.15)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.65rem 0.85rem',
            color: 'var(--color-danger)',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Masukkan username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Masukkan password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', justifyContent: 'center' }} disabled={isLoggingIn}>
            {isLoggingIn ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem', textAlign: 'center' }}>
            Quick Login Demo Accounts:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
              onClick={() => handleQuickLogin('admin', 'admin')}
              disabled={isLoggingIn}
            >
              <span>🔑 <strong>Admin Pusat</strong></span>
              <span style={{ color: 'var(--text-muted)' }}>Nasional</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
              onClick={() => handleQuickLogin('budi', 'budi')}
              disabled={isLoggingIn}
            >
              <span>👤 <strong>Budi Santoso (Petugas)</strong></span>
              <span style={{ color: 'var(--color-primary)' }}>Jakarta Selatan</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '0.5rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
              onClick={() => handleQuickLogin('ani', 'ani')}
              disabled={isLoggingIn}
            >
              <span>👤 <strong>Ani Wijaya (Petugas)</strong></span>
              <span style={{ color: 'var(--color-info)' }}>Kota Tangerang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
