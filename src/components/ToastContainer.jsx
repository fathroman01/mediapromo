import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '350px',
      width: '100%',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        let bgColor = 'rgba(30, 41, 59, 0.95)'; // default slate
        let icon = <Info size={18} color="#3b82f6" />;
        let borderColor = 'rgba(59, 130, 246, 0.3)';
        
        if (toast.type === 'success') {
          bgColor = 'rgba(6, 78, 59, 0.95)';
          borderColor = 'rgba(16, 185, 129, 0.3)';
          icon = <CheckCircle size={18} color="#10b981" />;
        } else if (toast.type === 'error') {
          bgColor = 'rgba(127, 29, 29, 0.95)';
          borderColor = 'rgba(239, 68, 68, 0.3)';
          icon = <AlertCircle size={18} color="#ef4444" />;
        } else if (toast.type === 'warning') {
          bgColor = 'rgba(120, 53, 15, 0.95)';
          borderColor = 'rgba(245, 158, 11, 0.3)';
          icon = <AlertCircle size={18} color="#f59e0b" />;
        }

        return (
          <div 
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: bgColor,
              backdropFilter: 'blur(8px)',
              color: 'white',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              fontSize: '0.85rem',
              pointerEvents: 'auto',
              border: `1px solid ${borderColor}`,
              animation: 'tabFadeSlideIn 0.25s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {icon}
              <span style={{ fontWeight: '500' }}>{toast.message}</span>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
