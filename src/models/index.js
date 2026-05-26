import { MEDIA_TYPES } from '../constants';

export const normalizeMediaType = (type) => {
  return MEDIA_TYPES.includes(type) ? type : 'Banner';
};

export const normalizePromoItem = (item) => {
  if (!item) return null;
  return {
    ...item,
    id: item.id || `promo-local-${Date.now()}`,
    outletName: item.outletName || 'Outlet Tanpa Nama',
    address: item.address || 'Tidak ada alamat',
    reporterName: item.reporterName || 'Anonim',
    mediaType: normalizeMediaType(item.mediaType),
    mediaType2: item.mediaType2 ? normalizeMediaType(item.mediaType2) : '',
    quantity: item.quantity ? parseInt(item.quantity) : 1,
    quantity2: item.quantity2 ? parseInt(item.quantity2) : 0,
    hasSecondMedia: !!item.hasSecondMedia,
    latitude: item.latitude ? parseFloat(item.latitude) : null,
    longitude: item.longitude ? parseFloat(item.longitude) : null,
    regency: item.regency ? item.regency.replace(/^KABUPATEN\b/gi, 'KAB.') : '',
    mediaItems: Array.isArray(item.mediaItems)
      ? item.mediaItems.map(m => ({
          type: normalizeMediaType(m.type),
          quantity: m.quantity ? parseInt(m.quantity) : 1,
          width: m.width || '',
          height: m.height || ''
        }))
      : [],
    condition: item.condition || 'Good',
    notes: item.notes || '',
    photoUrl: item.photoUrl || '/uploads/placeholder-media.jpg',
    createdAt: item.createdAt || new Date().toISOString()
  };
};
