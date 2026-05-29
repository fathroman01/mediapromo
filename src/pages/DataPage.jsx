import React from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import PromoTable from '../components/PromoTable';

export default function DataPage({ onSelectDetails, onEditItem, onPreviewPhoto }) {
  const { items, refreshAppData, addToast } = useApp();

  const handleUpdateStatus = async (id, newCondition, file) => {
    if (!file) {
      addToast('Unggahan foto verifikasi dari kamera wajib disertakan untuk mengubah kondisi!', 'warning');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('condition', newCondition);
      formData.append('photo', file);
      await api.updatePromo(id, formData);
      addToast('Status kondisi dan foto verifikasi berhasil diperbarui.', 'success');
      refreshAppData();
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui status kondisi.', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await api.deletePromo(id);
      addToast('Data media promo berhasil dihapus.', 'success');
      refreshAppData();
    } catch (err) {
      addToast(err.message || 'Gagal menghapus data.', 'error');
    }
  };

  const handleUpdatePhoto = async (id, file, photoField = 'photo') => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photoField', photoField);
      await api.updatePromo(id, formData);
      addToast(photoField === 'conditionPhoto' ? 'Foto kondisi terbaru berhasil diperbarui.' : 'Foto saat terpasang berhasil diperbarui.', 'success');
      refreshAppData();
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui foto.', 'error');
    }
  };

  return (
    <PromoTable 
      items={items} 
      onSelectDetails={onSelectDetails} 
      onUpdateStatus={handleUpdateStatus}
      onDeleteItem={handleDeleteItem}
      onUpdatePhoto={handleUpdatePhoto}
      onEditItem={onEditItem}
      onPreviewPhoto={onPreviewPhoto}
    />
  );
}
