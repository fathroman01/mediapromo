import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function OfflineIndicator() {
  const { isOnline, syncQueueCount, isSyncing, syncOfflineData } = useApp();

  if (isOnline && syncQueueCount === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '75px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '20px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
      fontSize: '0.8rem',
      fontWeight: '600',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      background: !isOnline ? 'rgba(239, 68, 68, 0.9)' : 'rgba(5, 150, 105, 0.9)',
      backdropFilter: 'blur(8px)'
    }}>
      {!isOnline ? (
        <>
          <WifiOff size={14} />
          <span>Aplikasi Offline {syncQueueCount > 0 && `(${syncQueueCount} data tertunda)`}</span>
        </>
      ) : (
        <>
          <RefreshCw size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
          <span>
            {isSyncing 
              ? 'Menyinkronkan data...' 
              : `Ada ${syncQueueCount} data offline siap disinkronkan.`}
          </span>
          {!isSyncing && (
            <button 
              onClick={syncOfflineData}
              style={{
                marginLeft: '8px',
                background: 'white',
                border: 'none',
                color: 'var(--color-primary)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Kirim
            </button>
          )}
        </>
      )}
    </div>
  );
}
