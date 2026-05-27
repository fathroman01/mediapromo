import React, { useState } from 'react';
import { Layers, Store, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../store/AppContext';

const TYPE_COLORS = {
  Banner:  { dot: '#2563eb', bg: 'rgba(37,99,235,0.1)',  text: '#2563eb' },
  Pamflet: { dot: '#6366f1', bg: 'rgba(99,102,241,0.1)', text: '#6366f1' },
  Sticker: { dot: '#f59e0b', bg: 'rgba(245,158,11,0.1)', text: '#b45309' },
};

export default function Dashboard({ stats, rawData }) {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const totalMedia   = stats?.totalMedia   || 0;
  const totalOutlets = stats?.totalOutlets || 0;
  const mediaTypes   = stats?.mediaTypes   || {};

  // Bar-chart data for media types
  const mediaTypeData = Object.keys(mediaTypes)
    .map(type => ({ name: type, value: mediaTypes[type] }))
    .sort((a, b) => b.value - a.value);
  const maxMediaTypeVal = mediaTypeData.length > 0 ? Math.max(...mediaTypeData.map(d => d.value)) : 1;

  // Kecamatan aggregation (for Officers)
  const kecamatanMap = {};
  // Regency/Kabupaten aggregation (for Admin)
  const regencyMap = {};

  (rawData || []).forEach(item => {
    // Count total media quantity
    let qty = 0;
    const mediaList = [];
    if (Array.isArray(item.mediaItems) && item.mediaItems.length > 0) {
      item.mediaItems.forEach(m => {
        const q = Number(m.quantity) || 1;
        qty += q;
        mediaList.push({ type: m.type || 'Banner', qty: q });
      });
    } else {
      const q1 = Number(item.quantity) || 1;
      qty += q1;
      mediaList.push({ type: item.mediaType, qty: q1 });
      if (item.hasSecondMedia && item.mediaType2) {
        const q2 = Number(item.quantity2) || 0;
        qty += q2;
        mediaList.push({ type: item.mediaType2, qty: q2 });
      }
    }

    // A. Aggregate by Kabupaten/Kota (for Admin)
    const regKey = item.regency || 'Lainnya';
    const distKey = item.district || 'Lainnya';
    if (!regencyMap[regKey]) {
      regencyMap[regKey] = { total: 0, outlets: new Set(), byDistrict: {} };
    }
    const regEntry = regencyMap[regKey];
    regEntry.outlets.add(item.outletName);
    regEntry.total += qty;

    if (!regEntry.byDistrict[distKey]) {
      regEntry.byDistrict[distKey] = { total: 0, byType: {} };
    }
    const dEntry = regEntry.byDistrict[distKey];
    dEntry.total += qty;
    mediaList.forEach(m => {
      dEntry.byType[m.type] = (dEntry.byType[m.type] || 0) + m.qty;
    });

    // B. Aggregate by Kecamatan (for fallback / Officers)
    if (item.district) {
      const kKey = item.district;
      if (!kecamatanMap[kKey]) {
        kecamatanMap[kKey] = { total: 0, outlets: new Set(), byType: {} };
      }
      const kEntry = kecamatanMap[kKey];
      kEntry.outlets.add(item.outletName);
      kEntry.total += qty;
      mediaList.forEach(m => {
        kEntry.byType[m.type] = (kEntry.byType[m.type] || 0) + m.qty;
      });
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

  const regencyData = Object.entries(regencyMap)
    .map(([name, v]) => ({
      name,
      total: v.total,
      outlets: v.outlets.size,
      byDistrict: Object.entries(v.byDistrict)
        .map(([dName, dVal]) => ({ name: dName, qty: dVal.total, byType: dVal.byType }))
        .sort((a, b) => b.qty - a.qty),
    }))
    .sort((a, b) => b.total - a.total);

  const maxKec = kecamatanData.length > 0 ? Math.max(...kecamatanData.map(d => d.total)) : 1;
  const maxReg = regencyData.length > 0 ? Math.max(...regencyData.map(d => d.total)) : 1;

  const barColors = [
    'linear-gradient(90deg,#2563eb,#0ea5e9)',
    'linear-gradient(90deg,#0d9488,#06b6d4)',
    'linear-gradient(90deg,#6366f1,#8b5cf6)',
    'linear-gradient(90deg,#f59e0b,#f97316)',
    'linear-gradient(90deg,#ef4444,#ec4899)',
    'linear-gradient(90deg,#10b981,#84cc16)',
  ];

  const [expandedKec, setExpandedKec] = useState(null);
  const [expandedReg, setExpandedReg] = useState(null);

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

        {/* Sebaran per Kecamatan / Regency */}
        <div className="glass-card stats-card">
          {isAdmin ? (
            <>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={16} color="var(--color-primary)" />
                Sebaran per Kabupaten / Kota
              </h3>

              {regencyData.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Belum ada data wilayah</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {regencyData.map((reg, idx) => {
                    const pct   = (reg.total / maxReg) * 100;
                    const color = barColors[idx % barColors.length];
                    const isOpen = expandedReg === reg.name;

                    return (
                      <div
                        key={reg.name}
                        style={{
                          border: `1px solid ${isOpen ? 'rgba(37,99,235,0.3)' : 'var(--border-color)'}`,
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: isOpen ? 'rgba(37,99,235,0.02)' : 'rgba(255,255,255,0.6)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div
                          onClick={() => setExpandedReg(isOpen ? null : reg.name)}
                          style={{ padding: '0.65rem 0.85rem', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                              {reg.name.replace(/^KABUPATEN\b/gi, 'Kab.').replace(/^KOTA\b/gi, 'Kota').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{reg.total} unit</span>
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
                                {reg.outlets} outlet
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--border-color)' }}>•</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {reg.total} unit total
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                              {reg.byDistrict.map((dist, dIdx) => {
                                const distPct = reg.total > 0 ? (dist.qty / reg.total) * 100 : 0;
                                const distColor = 'var(--color-primary)';
                                return (
                                  <div key={dIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: distColor, flexShrink: 0 }} />
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '600', minWidth: '80px', textTransform: 'capitalize' }}>
                                        Kec. {dist.name.toLowerCase()}
                                      </span>
                                      <div style={{ flex: 1, height: '6px', background: 'rgba(15,23,42,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${distPct}%`, background: distColor, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                                      </div>
                                      <span style={{
                                        fontSize: '0.72rem', fontWeight: '700', flexShrink: 0,
                                        padding: '1px 7px', borderRadius: '999px',
                                        background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-primary)',
                                      }}>
                                        {dist.qty} unit
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingLeft: '1.1rem' }}>
                                      {Object.entries(dist.byType || {})
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([type, qty]) => {
                                          const tc = TYPE_COLORS[type] || { dot: '#64748b', bg: 'rgba(100,116,139,0.1)', text: '#64748b' };
                                          return (
                                            <span
                                              key={type}
                                              style={{
                                                fontSize: '0.68rem',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                padding: '1px 6px',
                                                borderRadius: '4px',
                                                background: tc.bg,
                                                color: tc.text,
                                                fontWeight: '600'
                                              }}
                                            >
                                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: tc.dot }} />
                                              {type}: {qty}
                                            </span>
                                          );
                                        })}
                                    </div>
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
            </>
          ) : (
            <>
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
                    const color = barColors[idx % barColors.length];
                    const isOpen = expandedKec === kec.name;
                    const typeEntries = Object.entries(kec.byType).sort((a, b) => b[1] - a[1]);

                    return (
                      <div
                        key={kec.name}
                        style={{
                          border: `1px solid ${isOpen ? 'rgba(37,99,235,0.3)' : 'var(--border-color)'}`,
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: isOpen ? 'rgba(37,99,235,0.02)' : 'rgba(255,255,255,0.6)',
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
