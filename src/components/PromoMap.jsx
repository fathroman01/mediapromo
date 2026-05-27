import React, { useEffect, useRef } from 'react';

export default function PromoMap({ items, onSelectDetails, onClose }) {
  const mapRef = useRef(null);
  const leafletMapInstance = useRef(null);
  const markersGroupRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!leafletMapInstance.current && mapRef.current) {
      if (typeof window !== 'undefined' && window.L) {
        const L = window.L;

        leafletMapInstance.current = L.map(mapRef.current, {
          center: [-6.2297, 106.8296],
          zoom: 12,
          scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(leafletMapInstance.current);

        markersGroupRef.current = L.featureGroup().addTo(leafletMapInstance.current);

        // Invalidate map size after initialization to ensure it fits the fullscreen modal container
        setTimeout(() => {
          if (leafletMapInstance.current) {
            leafletMapInstance.current.invalidateSize();
          }
        }, 300);
      }
    }

    return () => {
      if (leafletMapInstance.current) {
        leafletMapInstance.current.remove();
        leafletMapInstance.current = null;
      }
    };
  }, []);

  // Update Markers when items change
  useEffect(() => {
    if (leafletMapInstance.current && markersGroupRef.current && typeof window !== 'undefined' && window.L) {
      const L = window.L;
      const markersGroup = markersGroupRef.current;
      
      markersGroup.clearLayers();

      items.forEach(item => {
        const lat = parseFloat(item.latitude);
        const lng = parseFloat(item.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const isGood = item.condition === 'Good';
        const markerColor = isGood ? '#059669' : '#ef4444';

        const customMarkerIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="
            width: 24px;
            height: 24px;
            border-radius: 50% 50% 50% 0;
            background: ${markerColor};
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
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

        const marker = L.marker([lat, lng], { icon: customMarkerIcon });

        const popupContent = document.createElement('div');
        popupContent.className = 'map-popup-card';
        popupContent.innerHTML = `
          <img class="map-popup-img" src="${item.photoUrl}" alt="${item.outletName}" onerror="this.src='/uploads/placeholder-media.jpg'" />
          <div class="map-popup-body">
            <h4 class="map-popup-title">${item.outletName}</h4>
            <div class="map-popup-detail">
              <strong>${item.quantity || 1}x ${item.mediaType}</strong>
              ${item.hasSecondMedia && item.mediaType2 ? `<br/><strong>${item.quantity2 || 0}x ${item.mediaType2}</strong>` : ''}
            </div>
            <div class="map-popup-detail" style="margin-top: 4px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.65rem; color: #9ca3af;">Tanggal Pasang: ${item.installationDate || '-'}</span>
            </div>
            <div class="map-popup-footer">
              <button class="btn btn-primary" id="btn-popup-${item.id}" style="width: 100%; padding: 0.35rem; font-size: 0.75rem; justify-content: center; border-radius: 6px;">
                Lihat Detail Lengkap
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-popup-${item.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.preventDefault();
              if (onSelectDetails) {
                onSelectDetails(item);
              }
              marker.closePopup();
            };
          }
        });

        markersGroup.addLayer(marker);
      });

      try {
        const bounds = markersGroup.getBounds();
        if (bounds.isValid()) {
          leafletMapInstance.current.fitBounds(bounds, { padding: [40, 40] });
        }
      } catch (e) {
        console.warn('Could not fit map bounds:', e);
      }
    }
  }, [items, onSelectDetails]);

  return (
    <div 
      className="glass-card" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        margin: 0,
        borderRadius: 0,
        padding: '1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        width: '100vw',
        background: '#ffffff',
        boxShadow: 'none',
        border: 'none',
        gap: '0.75rem',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      {/* Top Header: Title Only */}
      <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="pulse-green" style={{ width: '10px', height: '10px' }}></span> Sebaran Media Promo
        </h3>
      </div>

      {/* Map Element in the Middle */}
      <div className="map-container-wrapper" style={{ flex: 1, height: '100%', minHeight: 'auto', borderRadius: '14px' }}>
        <div ref={mapRef} className="leaflet-map-element"></div>
      </div>

      {/* Bottom Action Bar: Tutup Peta Button */}
      {onClose && (
        <div style={{ display: 'flex', width: '100%', paddingTop: '0.25rem' }}>
          <button 
            onClick={onClose} 
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              padding: '0.85rem', 
              fontSize: '0.95rem', 
              borderRadius: '12px', 
              fontWeight: '600', 
              justifyContent: 'center',
              boxShadow: '0 4px 15px var(--color-primary-alpha)',
              border: 'none',
              color: 'white'
            }}
          >
            Tutup Peta
          </button>
        </div>
      )}
    </div>
  );
}
