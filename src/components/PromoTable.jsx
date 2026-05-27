import React, { useState } from 'react';
import { Search, Download, Trash2, ChevronDown, ChevronUp, MapPin, Calendar, User, Layers, Compass } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CONDITION_LABELS } from '../constants';

export default function PromoTable({ items, onSelectDetails, onUpdateStatus, onDeleteItem }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [expandedId, setExpandedId] = useState(null);

  const mediaTypes = ['All', ...new Set(items.map(item => item.mediaType))];

  const filteredItems = items.filter(item => {
    const q = searchTerm.toLowerCase();
    const searchMatch =
      item.outletName.toLowerCase().includes(q) ||
      (item.address || '').toLowerCase().includes(q) ||
      (item.reporterName || '').toLowerCase().includes(q) ||
      (item.regency || '').toLowerCase().includes(q);
    const typeMatch = selectedType === 'All' || item.mediaType === selectedType;
    return searchMatch && typeMatch;
  });

  const exportToExcel = () => {
    if (filteredItems.length === 0) { alert('Tidak ada data untuk diekspor.'); return; }
    
    const dataToExport = filteredItems.map(item => {
      let types = [];
      let dims = [];
      const unit = item.unit || 'm';
      
      if (Array.isArray(item.mediaItems) && item.mediaItems.length > 0) {
        item.mediaItems.forEach(m => {
          types.push(`${m.type} (${m.quantity}x)`);
          dims.push(m.width && m.height ? `${m.width} x ${m.height} ${unit}` : '-');
        });
      } else {
        types.push(`${item.mediaType || 'Banner'} (${item.quantity || 1}x)`);
        dims.push(item.dimensions || '-');
        
        if (item.hasSecondMedia && item.mediaType2) {
          types.push(`${item.mediaType2} (${item.quantity2 || 1}x)`);
          dims.push(item.dimensions2 || '-');
        }
      }

      return {
        'ID': item.id || '',
        'Nama Outlet': item.outletName || '',
        'Provinsi': item.province || '',
        'Kabupaten/Kota': (item.regency || '').replace(/^KABUPATEN\b/gi, 'KAB.'),
        'Kecamatan': item.district || '',
        'Desa/Kelurahan': item.village || '',
        'Alamat': item.address || '',
        'Tipe Media': types.join(', '),
        'Dimensi': dims.join(', '),
        'Tanggal Pasang': item.installationDate ? item.installationDate.split('-').reverse().join('-') : '',
        'Jam Pasang': item.installationTime || '-',
        'Latitude': item.latitude || '',
        'Longitude': item.longitude || '',
        'Petugas': item.reporterName || '',
        'Catatan': item.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Media Promo");
    
    // Simpan ke file murni .xlsx
    XLSX.writeFile(workbook, `data-media-promo-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="glass-card table-section">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontFamily: 'var(--font-display)', margin: 0 }}>
          Data Media Promo <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}>({filteredItems.length} entri)</span>
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportToExcel} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', gap: '5px', borderColor: '#10b981', color: '#10b981', background: 'rgba(16,185,129,0.05)' }}>
            <Download size={14} color="#10b981" /> Ekspor Excel
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Cari outlet, wilayah, petugas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="select-input" style={{ minWidth: '130px' }} value={selectedType} onChange={e => setSelectedType(e.target.value)}>
          <option value="All">Semua Tipe</option>
          {mediaTypes.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Tidak ada data yang sesuai filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredItems.map(item => {
            const isOpen = expandedId === item.id;
            const cond = CONDITION_LABELS[item.condition] || { text: item.condition, color: 'var(--text-muted)', bg: 'transparent' };
            return (
              <div
                key={item.id}
                style={{
                  border: `1px solid ${isOpen ? 'rgba(37,99,235,0.35)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-sm)',
                  background: isOpen ? 'rgba(37,99,235,0.03)' : 'rgba(255,255,255,0.7)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}
              >
                {/* Compact Row — always visible */}
                <div
                  onClick={() => toggle(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <img
                    src={item.photoUrl}
                    alt={item.outletName}
                    onError={e => { e.target.src = '/uploads/placeholder-media.jpg'; }}
                    style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-color)' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.outletName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                      <Layers size={11} />
                      <span>{item.quantity || 1}x {item.mediaType}</span>
                      {item.hasSecondMedia && item.mediaType2 && (
                        <span style={{ color: 'var(--color-primary)' }}>· {item.quantity2 || 0}x {item.mediaType2}</span>
                      )}
                    </div>
                  </div>

                  <span style={{
                    flexShrink: 0,
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: cond.bg,
                    color: cond.color,
                  }}>
                    {cond.text}
                  </span>

                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>

                {/* Expanded Detail Panel */}
                {isOpen && (
                  <div style={{
                    borderTop: '1px solid var(--border-color)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                    background: 'rgba(255,255,255,0.85)',
                    animation: 'tabFadeSlideIn 0.2s ease-out',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                      <DetailItem label="Wilayah" value={[item.province, (item.regency || '').replace(/^KABUPATEN\b/gi, 'KAB.'), item.district, item.village].filter(Boolean).join(' › ') || '-'} icon={<MapPin size={12} />} />
                      <DetailItem label="Alamat" value={item.address || '-'} />
                      <DetailItem label="Dimensi" value={item.dimensions || '-'} />
                      <DetailItem label="Tanggal Pasang" value={item.installationDate ? new Date(item.installationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} icon={<Calendar size={12} />} />

                      <DetailItem label="Koordinat GPS" value={(item.latitude && item.longitude) ? `${item.latitude}, ${item.longitude}` : 'Tidak ada koordinat'} icon={<Compass size={12} />} />
                      {item.notes && <DetailItem label="Catatan" value={item.notes} full />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ubah kondisi:</span>
                        <select
                          className="select-input"
                          value={item.condition}
                          onChange={e => onUpdateStatus(item.id, e.target.value)}
                          style={{ padding: '3px 1.5rem 3px 6px', fontSize: '0.78rem', borderRadius: '6px' }}
                        >
                          <option value="Good">Bagus</option>
                          <option value="Damaged">Rusak</option>
                          <option value="Needs Replacement">Perlu Ganti</option>
                          <option value="Missing">Hilang</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px', gap: '4px' }}
                          onClick={() => onSelectDetails(item)}
                        >
                          Lihat Detail
                        </button>
                        <button
                          className="btn btn-danger-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px', gap: '4px' }}
                          onClick={() => {
                            if (window.confirm(`Hapus data outlet "${item.outletName}"?`)) onDeleteItem(item.id);
                          }}
                        >
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '500' }}>{value}</div>
    </div>
  );
}
