import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      zIndex: 1000,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      maxWidth: '300px',
      width: '100%',
      boxShadow: 'var(--glass-shadow)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      backdropFilter: 'blur(8px)',
      pointerEvents: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>Instal Aplikasi</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            Instal Media Promo ST di ponsel Anda untuk akses cepat & lancar.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
        >
          <X size={14} />
        </button>
      </div>
      <button 
        onClick={handleInstallClick}
        className="btn btn-primary"
        style={{ padding: '6px 12px', fontSize: '0.75rem', justifyContent: 'center', borderRadius: '6px', width: '100%', gap: '4px' }}
      >
        <Download size={12} /> Pasang Aplikasi
      </button>
    </div>
  );
}
