import React, { useState } from 'react';
import { Layers, User, Shield, LogOut, QrCode, Smartphone, X, LayoutDashboard, PlusCircle, ClipboardList, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import InputPage from '../pages/InputPage';
import DataPage from '../pages/DataPage';
import UserManagementPage from '../pages/UserManagementPage';
import ToastContainer from '../components/ToastContainer';
import OfflineIndicator from '../components/OfflineIndicator';
import InstallPrompt from '../components/InstallPrompt';
import PromoDetailModal from '../components/PromoDetailModal';

export default function MainLayout() {
  const { currentUser, activeTab, setActiveTab, logout, networkIpInfo } = useApp();
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);

  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
        <OfflineIndicator />
      </>
    );
  }

  const displayIp = networkIpInfo.localIp || window.location.hostname;
  const mobileUrl = `http://${displayIp}:${networkIpInfo.port}`;

  return (
    <div className="app-container">
      {/* Premium Glass Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <Layers size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="logo-title">Media Promo ST</h1>
            <div className="logo-subtitle">Pendataan & Pemantauan Media Promo</div>
          </div>
        </div>

        {/* Tab Navigation pills */}
        <div className="nav-pills">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>

          <button 
            className={`nav-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            <PlusCircle size={16} /> Input
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            <ClipboardList size={16} /> Data
          </button>

          {currentUser?.role === 'admin' && (
            <button 
              className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} /> Petugas
            </button>
          )}
        </div>

        {/* User Profile / Logout section */}
        <div className="header-profile">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: currentUser.role === 'admin' ? 'rgba(13, 148, 136, 0.15)' : 'rgba(5, 150, 105, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentUser.role === 'admin' ? 'var(--color-secondary)' : 'var(--color-primary)',
              flexShrink: 0
            }}>
              {currentUser.role === 'admin' ? <Shield size={16} /> : <User size={16} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>{currentUser.name}</span>
              <span className="header-profile-role" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {currentUser.role === 'admin' ? 'Administrator' : `Wilayah: ${currentUser.assignedRegencyName}`}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button 
              onClick={logout} 
              className="btn btn-secondary" 
              style={{ 
                padding: '0.4rem 0.75rem', 
                borderRadius: '8px', 
                gap: '4px', 
                fontSize: '0.75rem', 
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: 'var(--color-danger)',
                fontWeight: '600'
              }}
              title="Keluar dari sistem"
            >
              <LogOut size={12} color="var(--color-danger)" /> Keluar
            </button>

            {/* Connect Device QR Trigger */}
            <button 
              className="btn btn-secondary desktop-only-btn" 
              onClick={() => setShowQrModal(true)}
              style={{ gap: '0.4rem', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)', padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            >
              <QrCode size={12} color="var(--color-primary)" /> Hubungkan
            </button>
          </div>
        </div>
      </header>

      {/* Wilayah Restriksi Banner for Officer */}
      {currentUser.role === 'officer' && (
        <div className="officer-restriction-banner">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(99,102,241,0.15)',
            color: 'var(--color-primary)'
          }}>
            <User size={16} />
          </div>
          <div>
            Mode Akses Terbatas: Anda login sebagai <strong>{currentUser.name}</strong>. Anda hanya dapat mengelola dan memantau data di wilayah kerja <strong>{currentUser.assignedProvinceName} - {currentUser.assignedRegencyName}</strong>.
          </div>
        </div>
      )}

      {/* Main View Container */}
      <main style={{ minHeight: '60vh', marginBottom: '4.5rem' }}>
        {activeTab === 'dashboard' && <DashboardPage onSelectDetails={setSelectedPromo} />}
        {activeTab === 'form' && <InputPage />}
        {activeTab === 'table' && <DataPage onSelectDetails={setSelectedPromo} />}
        {currentUser?.role === 'admin' && activeTab === 'users' && <UserManagementPage />}
      </main>

      {/* Global Details Modal */}
      {selectedPromo && (
        <PromoDetailModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      )}

      {/* Modal: Connect Phone QR Code */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Smartphone size={20} color="var(--color-primary)" /> Akses Lewat Ponsel
              </h3>
              <button className="modal-close" onClick={() => setShowQrModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body qr-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                Scan QR Code di bawah untuk membuka form input media promo langsung dari ponsel Anda.
              </p>
              
              <div className="qr-image-wrapper" style={{ padding: '1rem', background: 'white', borderRadius: '12px', display: 'flex', justifyContent: 'center' }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mobileUrl)}`} 
                  alt="QR Code" 
                  style={{ width: '160px', height: '160px', display: 'block' }}
                />
              </div>

              <div className="qr-link-text" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 'bold', wordBreak: 'break-all', textAlign: 'center' }}>
                {mobileUrl}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', width: '100%', background: 'rgba(15, 23, 42, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <strong>Petunjuk Koneksi:</strong>
                <span>1. Ponsel dan Laptop harus terhubung ke Wi-Fi / jaringan lokal yang sama.</span>
                <span>2. Jika QR Code tidak terbuka, Anda dapat mengetik URL di atas secara manual di browser ponsel.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar for Mobile */}
      <div className="bottom-nav">
        <button 
          className={`bottom-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="bottom-nav-icon-wrapper">
            <LayoutDashboard size={20} />
          </div>
          <span>Dashboard</span>
        </button>

        <button 
          className={`bottom-nav-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          <div className="bottom-nav-icon-wrapper">
            <PlusCircle size={20} />
          </div>
          <span>Input</span>
        </button>
        
        <button 
          className={`bottom-nav-btn ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >
          <div className="bottom-nav-icon-wrapper">
            <ClipboardList size={20} />
          </div>
          <span>Data</span>
        </button>

        {currentUser?.role === 'admin' && (
          <button 
            className={`bottom-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <div className="bottom-nav-icon-wrapper">
              <Users size={20} />
            </div>
            <span>Petugas</span>
          </button>
        )}
      </div>

      {/* Global Utilities */}
      <ToastContainer />
      <OfflineIndicator />
      <InstallPrompt />
    </div>
  );
}
