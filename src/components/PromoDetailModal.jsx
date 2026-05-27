import React, { useEffect, useRef } from 'react';
import { X, MapPin, Calendar, User, Layers, Compass, FileText, Store } from 'lucide-react';
import { CONDITION_LABELS } from '../constants';

export default function PromoDetailModal({ promo, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    const lat = parseFloat(promo.latitude);
    const lng = parseFloat(promo.longitude);

    if (!isNaN(lat) && !isNaN(lng) && mapRef.current && window.L) {
      const L = window.L;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false // disable scroll zoom inside modal for better UX
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);

      const markerColor = promo.condition === 'Good' ? '#059669' : '#ef4444';
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          background: ${markerColor};
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        "><div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });

      L.marker([lat, lng], { icon }).addTo(map);

      // Invalidate size to ensure map renders correctly inside the modal
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [promo]);

  const cond = CONDITION_LABELS[promo.condition] || { text: promo.condition, color: 'var(--text-muted)', bg: 'transparent' };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1010 }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={20} color="var(--color-primary)" /> Detail Media Promo
          </h3>
          <button 
            type="button" 
            className="modal-close" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Outlet Photo */}
          <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
            <img 
              src={promo.photoUrl} 
              alt={promo.outletName} 
              className="modal-photo" 
              onError={(e) => { e.target.src = '/uploads/placeholder-media.jpg'; }}
              style={{ width: '100%', height: '240px', objectFit: 'cover', display: 'block', marginBottom: 0 }}
            />
            <span style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '4px 12px',
              borderRadius: '999px',
              background: cond.bg,
              color: cond.color,
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              Kondisi: {cond.text}
            </span>
          </div>

          {/* Info Grid */}
          <div className="modal-info-grid">
            <div className="info-item">
              <span className="info-label"><Store size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Nama Outlet</span>
              <span className="info-val" style={{ color: 'var(--text-main)', fontWeight: '700', fontSize: '1.05rem' }}>{promo.outletName}</span>
            </div>

            <div className="info-item">
              <span className="info-label"><Layers size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Tipe & Jumlah Media</span>
              <span className="info-val" style={{ color: 'var(--text-main)' }}>
                {promo.quantity || 1}x {promo.mediaType}
                {promo.hasSecondMedia && promo.mediaType2 && ` & ${promo.quantity2 || 0}x ${promo.mediaType2}`}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label"><Layers size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Dimensi</span>
              <span className="info-val" style={{ color: 'var(--text-main)' }}>
                {promo.dimensions || '-'}
                {promo.hasSecondMedia && promo.mediaType2 && ` (Kedua: ${promo.dimensions2 || '-'})`}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label"><Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Tanggal Pemasangan</span>
              <span className="info-val" style={{ color: 'var(--text-main)' }}>
                {promo.installationDate ? new Date(promo.installationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </span>
            </div>



            <div className="info-item">
              <span className="info-label"><Compass size={12} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Koordinat GPS</span>
              <span className="info-val" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                {promo.latitude && promo.longitude ? `${promo.latitude}, ${promo.longitude}` : 'Tidak ada koordinat'}
              </span>
            </div>
          </div>

          {/* Region & Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <MapPin size={16} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Wilayah Kerja</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500', marginTop: '2px' }}>
                  {[promo.province, (promo.regency || '').replace(/^KABUPATEN\b/gi, 'KAB.'), promo.district, promo.village].filter(Boolean).join(' › ') || '-'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
              <FileText size={16} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>Alamat Lengkap</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px' }}>
                  {promo.address || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {promo.notes && (
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>Catatan Tambahan</div>
              <div className="info-notes" style={{ color: 'var(--text-main)', background: 'rgba(15, 23, 42, 0.01)', border: '1px solid var(--border-color)' }}>
                {promo.notes}
              </div>
            </div>
          )}

          {/* Map Viewer */}
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Compass size={12} /> Peta Lokasi GPS
            </div>
            {promo.latitude && promo.longitude ? (
              <div 
                ref={mapRef} 
                style={{ 
                  height: '200px', 
                  width: '100%', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)' 
                }}
              />
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(244,63,94,0.05)', border: '1px dashed var(--color-danger)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                ⚠️ Koordinat GPS tidak diinput atau tidak tersedia untuk data outlet ini.
              </div>
            )}
          </div>
        </div>

        <div className="modal-header" style={{ borderBottom: 'none', borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
}
