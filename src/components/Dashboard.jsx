import React, { useState } from 'react';
import { Layers, Store, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_COLORS = {
  Banner:  { dot: '#059669', bg: 'rgba(5,150,105,0.1)',  text: '#059669' },
  Pamflet: { dot: '#6366f1', bg: 'rgba(99,102,241,0.1)', text: '#6366f1' },
  Sticker: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: '#b45309' },
};

export default function Dashboard({ stats, rawData }) {
  const totalMedia   = stats?.totalMedia   || 0;
  const totalOutlets = stats?.totalOutlets || 0;
  const mediaTypes   = stats?.mediaTypes   || {};

  // Bar-chart data for media types
  const mediaTypeData = Object.keys(mediaTypes)
    .map(type => ({ name: type, value: mediaTypes[type] }))
    .sort((a, b) => b.value - a.value);
  const maxMediaTypeVal = mediaTypeData.length > 0 ? Math.max(...mediaTypeData.map(d => d.value)) : 1;

  // Kecamatan aggregation
  const kecamatanMap = {};
  (rawData || []).forEach(item => {
    if (!item.district) return;
    const key = item.district;
    if (!kecamatanMap[key]) {
      kecamatanMap[key] = { total: 0, outlets: new Set(), byType: {} };
    }
    const entry = kecamatanMap[key];
    entry.outlets.add(item.outletName);

    if (Array.isArray(item.mediaItems) && item.mediaItems.length > 0) {
      item.mediaItems.forEach(m => {
        const t = m.type || 'Banner';
        const q = Number(m.quantity) || 1;
        entry.total += q;
        entry.byType[t] = (entry.byType[t] || 0) + q;
      });
    } else {
      const q1 = Number(item.quantity) || 1;
      entry.total += q1;
      entry.byType[item.mediaType] = (entry.byType[item.mediaType] || 0) + q1;
      if (item.hasSecondMedia && item.mediaType2) {
        const q2 = Number(item.quantity2) || 0;
        entry.total += q2;
        entry.byType[item.mediaType2] = (entry.byType[item.mediaType2] || 0) + q2;
      }
    }
  });

  const kecamatanData = Object.entries(kecamatanMap)
    .map(([name, v]) => ({
      name,
      total: v.total,
      outlets: v.outlets.size,
      byType: v.byType,
    }))
    .sort((a, b) => b.total - a.total);

  const maxKec = kecamatanData.length > 0 ? Math.max(...kecamatanData.map(d => d.total)) : 1;

  const kecBarColors = [
    'linear-gradient(90deg,#059669,#0ea5e9)',
    'linear-gradient(90deg,#0d9488,#06b6d4)',
    'linear-gradient(90deg,#6366f1,#8b5cf6)',
    'linear-gradient(90deg,#f59e0b,#f97316)',
    'linear-gradient(90deg,#ef4444,#ec4899)',
    'linear-gradient(90deg,#10b981,#84cc16)',
  ];

  const [expandedKec, setExpandedKec] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="glass-card kpi-card" style={{ '--accent-color': 'var(--color-primary)' }}>
          <div className="kpi-info">
            <h3>Total Media Promo</h3>
            <div className="kpi-value">{totalMedia}</div>
          </div>
          <div className="kpi-icon-wrapper"><Layers size={24} /></div>
        </div>
        <div className="glass-card kpi-card" style={{ '--accent-color': 'var(--color-info)' }}>
          <div className="kpi-info">
            <h3>Total Outlet Terdaftar</h3>
            <div className="kpi-value">{totalOutlets}</div>
          </div>
          <div className="kpi-icon-wrapper"><Store size={24} /></div>
        </div>
      </div>

      {/* Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Sebaran Media Promo (by type) */}
        <div className="glass-card stats-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
            Sebaran Media Promo
          </h3>
          {mediaTypeData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Belum ada data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {mediaTypeData.map((media, idx) => {
                const pct = (media.value / maxMediaTypeVal) * 100;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{media.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{media.value} unit</span>
                    </div>
                    <div style={{ height: '10px', background: 'rgba(15,23,42,0.05)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--grad-primary)', borderRadius: '6px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sebaran per Kecamatan */}
        <div className="glass-card stats-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MapPin size={16} color="var(--color-primary)" />
            Sebaran per Kecamatan
          </h3>

          {kecamatanData.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Belum ada data kecamatan</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {kecamatanData.map((kec, idx) => {
                const pct   = (kec.total / maxKec) * 100;
                const color = kecBarColors[idx % kecBarColors.length];
                const isOpen = expandedKec === kec.name;
                const typeEntries = Object.entries(kec.byType).sort((a, b) => b[1] - a[1]);

                return (
                  <div
                    key={kec.name}
                    style={{
                      border: `1px solid ${isOpen ? 'rgba(5,150,105,0.3)' : 'var(--border-color)'}`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: isOpen ? 'rgba(5,150,105,0.02)' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      onClick={() => setExpandedKec(isOpen ? null : kec.name)}
                      style={{ padding: '0.65rem 0.85rem', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                          {kec.name.toLowerCase()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{kec.total} unit</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>
                      </div>

                      <div style={{ height: '8px', background: 'rgba(15,23,42,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{
                        borderTop: '1px dashed var(--border-color)',
                        padding: '0.75rem 0.85rem',
                        background: 'rgba(255,255,255,0.9)',
                        animation: 'tabFadeSlideIn 0.18s ease-out',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {kec.outlets} outlet
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--border-color)' }}>•</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {kec.total} unit total
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {typeEntries.map(([type, qty]) => {
                            const tc = TYPE_COLORS[type] || { dot: '#64748b', bg: 'rgba(100,116,139,0.1)', text: '#64748b' };
                            const typePct = kec.total > 0 ? (qty / kec.total) * 100 : 0;
                            return (
                              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tc.dot, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '600', minWidth: '60px' }}>{type}</span>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(15,23,42,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${typePct}%`, background: tc.dot, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                                </div>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: '700', flexShrink: 0,
                                  padding: '1px 7px', borderRadius: '999px',
                                  background: tc.bg, color: tc.text,
                                }}>
                                  {qty} unit
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
