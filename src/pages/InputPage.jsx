import React from 'react';
import { useApp } from '../store/AppContext';
import PromoForm from '../components/PromoForm';

export default function InputPage() {
  const { refreshAppData, setActiveTab, addToast, currentUser } = useApp();

  const handleSaveSuccess = () => {
    refreshAppData();
    setActiveTab('dashboard');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <PromoForm onSaveSuccess={handleSaveSuccess} currentUser={currentUser} />
    </div>
  );
}
