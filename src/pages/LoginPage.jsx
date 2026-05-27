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

      </div>
    </div>
  );
}
