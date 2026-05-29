import React, { useState } from 'react';
import { Layers, Store, MapPin, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { CONDITION_LABELS } from '../constants';

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

  // Calculate unique Regencies (Kab/Kota) and Districts (Kecamatan)
  const uniqueRegencies = new Set(
    (rawData || [])
      .map(item => item.regency)
      .filter(Boolean)
      .map(r => r.trim().toUpperCase())
      .filter(r => r !== 'LAINNYA' && r !== 'SEMUA')
  );
  const totalKabKota = uniqueRegencies.size;

  const uniqueDistricts = new Set(
    (rawData || [])
      .map(item => item.district)
      .filter(Boolean)
      .map(d => d.trim().toUpperCase())
      .filter(d => d !== 'LAINNYA' && d !== 'SEMUA')
  );
  const totalKecamatan = uniqueDistricts.size;

  const uniqueVillages = new Set(
    (rawData || [])
      .map(item => item.village)
      .filter(Boolean)
      .map(v => v.trim().toUpperCase())
      .filter(v => v !== 'LAINNYA' && v !== 'SEMUA')
  );
  const totalDesa = uniqueVillages.size;

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
      regEntry.byDistrict[distKey] = { total: 0, outlets: new Set(), villages: new Set(), byType: {}, byVillage: {} };
    }
    const dEntry = regEntry.byDistrict[distKey];
    dEntry.outlets.add(item.outletName);
    const vKeyReg = item.village ? item.village.trim().toUpperCase() : 'Lainnya';
    if (item.village) {
      dEntry.villages.add(vKeyReg);
    }
    dEntry.total += qty;
    mediaList.forEach(m => {
      dEntry.byType[m.type] = (dEntry.byType[m.type] || 0) + m.qty;
    });

    if (!dEntry.byVillage[vKeyReg]) {
      dEntry.byVillage[vKeyReg] = { total: 0, outlets: new Set(), byType: {} };
    }
    const dvEntry = dEntry.byVillage[vKeyReg];
    dvEntry.outlets.add(item.outletName);
    dvEntry.total += qty;
    mediaList.forEach(m => {
      dvEntry.byType[m.type] = (dvEntry.byType[m.type] || 0) + m.qty;
    });

    // B. Aggregate by Kecamatan (for fallback / Officers)
    if (item.district) {
      const kKey = item.district;
      if (!kecamatanMap[kKey]) {
        kecamatanMap[kKey] = { total: 0, outlets: new Set(), villages: new Set(), byType: {}, byVillage: {} };
      }
      const kEntry = kecamatanMap[kKey];
      kEntry.outlets.add(item.outletName);
      
      const vKey = item.village ? item.village.trim().toUpperCase() : 'Lainnya';
      if (item.village) {
        kEntry.villages.add(vKey);
      }
      kEntry.total += qty;
      mediaList.forEach(m => {
        kEntry.byType[m.type] = (kEntry.byType[m.type] || 0) + m.qty;
      });

      if (!kEntry.byVillage[vKey]) {
        kEntry.byVillage[vKey] = { total: 0, outlets: new Set(), byType: {} };
      }
      const vEntry = kEntry.byVillage[vKey];
      vEntry.outlets.add(item.outletName);
      vEntry.total += qty;
      mediaList.forEach(m => {
        vEntry.byType[m.type] = (vEntry.byType[m.type] || 0) + m.qty;
      });
    }
  });

  const kecamatanData = Object.entries(kecamatanMap)
    .map(([name, v]) => ({
      name,
      total: v.total,
      outlets: v.outlets.size,
      villages: v.villages.size,
      byType: v.byType,
      byVillage: Object.entries(v.byVillage)
        .map(([vName, vVal]) => ({ name: vName, qty: vVal.total, outlets: vVal.outlets.size, byType: vVal.byType }))
        .sort((a, b) => b.qty - a.qty),
    }))
    .sort((a, b) => b.total - a.total);

  const regencyData = Object.entries(regencyMap)
    .map(([name, v]) => ({
      name,
      total: v.total,
      outlets: v.outlets.size,
      byDistrict: Object.entries(v.byDistrict)
        .map(([dName, dVal]) => ({
          name: dName,
          qty: dVal.total,
          outlets: dVal.outlets.size,
          villages: dVal.villages.size,
          byType: dVal.byType,
          byVillage: Object.entries(dVal.byVillage)
            .map(([vName, vVal]) => ({ name: vName, qty: vVal.total, outlets: vVal.outlets.size, byType: vVal.byType }))
            .sort((a, b) => b.qty - a.qty),
        }))
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

  // Prepare Promo Tool Condition stats
  const conditionStats = stats?.conditions || { Good: 0, Damaged: 0, 'Needs Replacement': 0, Missing: 0 };
  const order = ['Good', 'Needs Replacement', 'Damaged', 'Missing'];
  const conditionData = order.map(key => {
    const labelInfo = CONDITION_LABELS[key] || { text: key, color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
    let IconComponent = HelpCircle;
    if (key === 'Good') IconComponent = CheckCircle;
    else if (key === 'Needs Replacement') IconComponent = AlertTriangle;
    else if (key === 'Damaged') IconComponent = AlertCircle;
    
    return {
      key,
      name: labelInfo.text,
      value: conditionStats[key] || 0,
      color: labelInfo.color,
      bg: labelInfo.bg,
      icon: IconComponent
    };
  });
  const maxConditionVal = conditionData.length > 0 ? Math.max(...conditionData.map(d => d.value)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Cards */}
      <div className="kpi-grid kpi-grid-mobile">
        <div className="kpi-card-modern" style={{ '--accent-color': '#2563eb' }}>
          <div className="kpi-content-modern">
            <span className="kpi-label-top">TOTAL</span>
            <span className="kpi-label-main">Media Promo</span>
            <div className="kpi-val-modern">{totalMedia}</div>
          </div>
        </div>

        <div className="kpi-card-modern" style={{ '--accent-color': '#0ea5e9' }}>
          <div className="kpi-content-modern">
            <span className="kpi-label-top">TOTAL</span>
            <span className="kpi-label-main">Outlet Terdaftar</span>
            <div className="kpi-val-modern">{totalOutlets}</div>
          </div>
        </div>

        <div className="kpi-card-modern" style={{ '--accent-color': '#8b5cf6' }}>
          <div className="kpi-content-modern">
            <span className="kpi-label-top">TOTAL</span>
            <span className="kpi-label-main">Kecamatan</span>
            <div className="kpi-val-modern">{totalKecamatan}</div>
          </div>
        </div>

        <div className="kpi-card-modern" style={{ '--accent-color': '#0d9488' }}>
          <div className="kpi-content-modern">
            <span className="kpi-label-top">TOTAL</span>
            <span className="kpi-label-main">{isAdmin ? 'Kab/Kota' : 'Desa'}</span>
            <div className="kpi-val-modern">{isAdmin ? totalKabKota : totalDesa}</div>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Sebaran Media Promo (by type) */}
        <div className="glass-card stats-card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.4rem' }}>
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

        {/* Kondisi Alat Promo */}
        <div className="glass-card stats-card">
          <h3 style={{ 
            fontSize: '1rem', 
            color: 'var(--text-main)', 
            borderBottom: '1px solid var(--border-color)', 
            paddingBottom: '0.25rem', 
            marginBottom: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <CheckCircle size={16} color="var(--color-primary)" />
            Kondisi Alat Promo
          </h3>
          {conditionData.every(d => d.value === 0) ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>
              Belum ada data kondisi
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {conditionData.map((cond, idx) => {
                const pct = maxConditionVal > 0 ? (cond.value / maxConditionVal) * 100 : 0;
                const Icon = cond.icon;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Icon size={14} color={cond.color} />
                        <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{cond.name}</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        padding: '1px 7px', 
                        borderRadius: '999px',
                        background: cond.bg, 
                        color: cond.color 
                      }}>
                        {cond.value} unit
                      </span>
                    </div>
                    <div style={{ 
                      height: '10px', 
                      background: 'rgba(15,23,42,0.05)', 
                      borderRadius: '6px', 
                      overflow: 'hidden', 
                      border: '1px solid var(--border-color)' 
                    }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${pct}%`, 
                        background: cond.color, 
                        borderRadius: '6px', 
                        transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' 
                      }} />
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
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                                {reg.name.replace(/^KABUPATEN\b/gi, 'Kab.').replace(/^KOTA\b/gi, 'Kota').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                {reg.byDistrict.length} kec
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                {reg.outlets} outlet
                              </span>
                            </div>
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
                               {reg.byDistrict.length} kec
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--border-color)' }}>•</span>
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
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '600', textTransform: 'capitalize' }}>
                                          Kec. {dist.name.toLowerCase()}
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 5px', borderRadius: '4px', fontWeight: '500' }}>
                                          {dist.villages} desa
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 5px', borderRadius: '4px', fontWeight: '500' }}>
                                          {dist.outlets} outlet
                                        </span>
                                      </div>
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
                                    {/* Sub-list of Villages under District (Admin view) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.1rem', marginTop: '0.2rem', marginBottom: '0.5rem', borderLeft: '1px dashed var(--border-color)', marginLeft: '0.4rem' }}>
                                      {dist.byVillage && dist.byVillage.map((vill, vIdx) => {
                                        const villPct = dist.qty > 0 ? (vill.qty / dist.qty) * 100 : 0;
                                        return (
                                          <div key={vIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.8rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />
                                              <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '500', textTransform: 'capitalize' }}>
                                                Ds. {vill.name.toLowerCase()}
                                              </span>
                                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                {vill.outlets} outlet
                                              </span>
                                              <div style={{ flex: 1, height: '4px', background: 'rgba(15,23,42,0.05)', borderRadius: '2px', overflow: 'hidden', marginLeft: '0.5rem', marginRight: '0.5rem' }}>
                                                <div style={{ height: '100%', width: `${villPct}%`, background: 'var(--text-muted)', borderRadius: '2px', opacity: 0.5 }} />
                                              </div>
                                              <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                                {vill.qty} unit
                                              </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', paddingLeft: '1.2rem' }}>
                                              {Object.entries(vill.byType || {})
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([type, qty]) => {
                                                  const tc = TYPE_COLORS[type] || { dot: '#64748b', text: '#64748b' };
                                                  return (
                                                    <span key={type} style={{ fontSize: '0.6rem', color: tc.text, background: 'rgba(15,23,42,0.03)', padding: '1px 4px', borderRadius: '3px' }}>
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
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                {kec.name.toLowerCase()}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                {kec.villages} desa
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>
                                {kec.outlets} outlet
                              </span>
                            </div>
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
                                {kec.villages} desa
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--border-color)' }}>•</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {kec.outlets} outlet
                              </span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--border-color)' }}>•</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {kec.total} unit total
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                              {kec.byVillage.map((vill, vIdx) => {
                                const villPct = kec.total > 0 ? (vill.qty / kec.total) * 100 : 0;
                                const villColor = 'var(--color-primary)';
                                return (
                                  <div key={vIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: villColor, flexShrink: 0 }} />
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '600', textTransform: 'capitalize' }}>
                                          Ds. {vill.name.toLowerCase()}
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.04)', padding: '1px 5px', borderRadius: '4px', fontWeight: '500' }}>
                                          {vill.outlets} outlet
                                        </span>
                                      </div>
                                      <div style={{ flex: 1, height: '6px', background: 'rgba(15,23,42,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${villPct}%`, background: villColor, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                                      </div>
                                      <span style={{
                                        fontSize: '0.72rem', fontWeight: '700', flexShrink: 0,
                                        padding: '1px 7px', borderRadius: '999px',
                                        background: 'rgba(37, 99, 235, 0.1)', color: 'var(--color-primary)',
                                      }}>
                                        {vill.qty} unit
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingLeft: '1.1rem' }}>
                                      {Object.entries(vill.byType || {})
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
          )}
        </div>
      </div>
    </div>
  );
}
