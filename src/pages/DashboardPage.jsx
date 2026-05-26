import React, { useState } from 'react';
import { Layers, RefreshCw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import Dashboard from '../components/Dashboard';
import PromoMap from '../components/PromoMap';

export default function DashboardPage({ onSelectDetails }) {
  const { stats, items, isLoading } = useApp();
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  if (isLoading && !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <RefreshCw className="pulse-green" size={32} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-primary)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Memuat Dashboard...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <Dashboard stats={stats} rawData={items} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
        {!isMapLoaded ? (
          <div 
            onClick={() => setIsMapLoaded(true)}
            className="glass-card interactive"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              gap: '1rem',
              boxShadow: 'var(--glass-shadow)',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '260px', flex: '1' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(5, 150, 105, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Layers size={20} />
              </div>
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-main)', fontWeight: '600', margin: 0 }}>
                  Sebaran Media Promo
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Klik untuk memuat peta interaktif secara real-time.
                </p>
              </div>
            </div>
            
            <button 
              className="btn btn-primary"
              style={{ padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', flexShrink: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsMapLoaded(true);
              }}
            >
              Buka Peta
            </button>
          </div>
        ) : (
          <PromoMap items={items} onSelectDetails={onSelectDetails} onClose={() => setIsMapLoaded(false)} />
        )}
      </div>
    </div>
  );
}
