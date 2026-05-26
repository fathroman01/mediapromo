import React from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import PromoTable from '../components/PromoTable';

export default function DataPage({ onSelectDetails }) {
  const { items, refreshAppData, addToast } = useApp();

  const handleUpdateStatus = async (id, newCondition) => {
    try {
      await api.updatePromoStatus(id, newCondition);
      addToast('Status kondisi media promo berhasil diperbarui.', 'success');
      refreshAppData();
    } catch (err) {
      addToast(err.message || 'Gagal memperbarui status.', 'error');
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

  return (
    <PromoTable 
      items={items} 
      onSelectDetails={onSelectDetails} 
      onUpdateStatus={handleUpdateStatus}
      onDeleteItem={handleDeleteItem}
    />
  );
}
