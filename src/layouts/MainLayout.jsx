import React, { useState, useEffect, useRef } from 'react';
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
import MediaTypeManagementModal from '../components/MediaTypeManagementModal';
import PromoForm from '../components/PromoForm';
import { CONDITION_LABELS } from '../constants';

export default function MainLayout() {
  const { currentUser, activeTab, setActiveTab, logout, networkIpInfo, refreshAppData } = useApp();
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMediaTypeModal, setShowMediaTypeModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handlePrevPhoto = () => {
    if (!previewPhoto || !previewPhoto.promo) return;
    const promo = previewPhoto.promo;
    if (previewPhoto.type === 'Kondisi Terbaru' && promo.photoUrl) {
      setPreviewPhoto({
        url: promo.photoUrl,
        type: 'Saat Terpasang',
        promo: promo
      });
    } else if (previewPhoto.type === 'Saat Terpasang' && promo.conditionPhotoUrl) {
      setPreviewPhoto({
        url: promo.conditionPhotoUrl,
        type: 'Kondisi Terbaru',
        promo: promo
      });
    }
  };

  const handleNextPhoto = () => {
    if (!previewPhoto || !previewPhoto.promo) return;
    const promo = previewPhoto.promo;
    if (previewPhoto.type === 'Saat Terpasang' && promo.conditionPhotoUrl) {
      setPreviewPhoto({
        url: promo.conditionPhotoUrl,
        type: 'Kondisi Terbaru',
        promo: promo
      });
    } else if (previewPhoto.type === 'Kondisi Terbaru' && promo.photoUrl) {
      setPreviewPhoto({
        url: promo.photoUrl,
        type: 'Saat Terpasang',
        promo: promo
      });
    }
  };

  const navigateToType = (type) => {
    if (!previewPhoto || !previewPhoto.promo) return;
    const promo = previewPhoto.promo;
    if (type === 'Saat Terpasang' && promo.photoUrl) {
      setPreviewPhoto({
        url: promo.photoUrl,
        type: 'Saat Terpasang',
        promo: promo
      });
    } else if (type === 'Kondisi Terbaru' && promo.conditionPhotoUrl) {
      setPreviewPhoto({
        url: promo.conditionPhotoUrl,
        type: 'Kondisi Terbaru',
        promo: promo
      });
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handlePrevPhoto();
      } else {
        handleNextPhoto();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation for photo preview lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!previewPhoto) return;
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        setPreviewPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewPhoto]);

  // Lock body scroll when lightbox photo preview is open
  useEffect(() => {
    if (previewPhoto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewPhoto]);

  // Auto scroll ke atas setiap kali ganti menu (tab)
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [activeTab]);

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
            <div className="header-region-text" style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '1px', letterSpacing: '0.01em' }}>
              {currentUser.role === 'admin' ? 'Seluruh Wilayah' : (currentUser.assignedRegencyName ? currentUser.assignedRegencyName.split(',').map(name => name.replace(/^KABUPATEN\b/gi, 'Kab.').replace(/^KOTA\b/gi, 'Kota').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())).join(', ') : '')}
            </div>
          </div>

          {/* Profile Menu Icon next to text - Mobile Only */}
          <button 
            className={`header-profile-btn mobile-only-profile ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            title="Profil"
          >
            <User size={20} />
          </button>
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
            <>
              <button 
                className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={16} /> Petugas
              </button>
              <button 
                className="nav-btn desktop-only-btn"
                onClick={() => setShowMediaTypeModal(true)}
              >
                <Layers size={16} /> Tipe Media
              </button>
            </>
          )}
        </div>

        {/* Profile Button - Desktop Only */}
        <button 
          className={`header-profile-btn desktop-only-profile ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          title="Profil"
        >
          <User size={20} />
        </button>
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
            Mode Akses Terbatas: Anda login sebagai <strong>{currentUser.name}</strong>. Anda hanya dapat mengelola dan memantau data di wilayah kerja <strong>{(() => {
              const regs = (currentUser.assignedRegencyName || '').split(',').filter(Boolean);
              const provs = (currentUser.assignedProvinceName || '').split(',').filter(Boolean);
              return regs.map((r, i) => `${provs[i] || ''} - ${r}`).join(', ');
            })()}</strong>.
          </div>
        </div>
      )}

      {/* Decorative Left Sidebar */}
      <div className="left-decorative-sidebar"></div>

      {/* Main View Container */}
      <main className="main-content" style={{ minHeight: '60vh', marginBottom: '4.5rem' }}>
        {activeTab === 'dashboard' && <DashboardPage onSelectDetails={setSelectedPromo} />}
        {activeTab === 'form' && <InputPage />}
        {activeTab === 'table' && <DataPage onSelectDetails={setSelectedPromo} onEditItem={setEditingPromo} onPreviewPhoto={setPreviewPhoto} />}
        {currentUser?.role === 'admin' && activeTab === 'users' && <UserManagementPage onBack={() => setActiveTab('profile')} />}
        
        {activeTab === 'profile' && (
          <div className="tab-content-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
            <div className="glass-card" style={{ padding: '2rem', maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: currentUser.role === 'admin' ? 'rgba(13, 148, 136, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentUser.role === 'admin' ? 'var(--color-secondary)' : 'var(--color-primary)',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                {currentUser.role === 'admin' ? <Shield size={36} /> : <User size={36} />}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>{currentUser.name}</h3>
                {currentUser.role === 'admin' && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Administrator
                  </span>
                )}
              </div>

              {currentUser.role !== 'admin' && (
                <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.02)', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: '600' }}>wilayah</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {currentUser.assignedRegencyName ? currentUser.assignedRegencyName.split(',').map(name => name.replace(/^KABUPATEN\b/gi, 'Kab.').replace(/^KOTA\b/gi, 'Kota').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())).join(', ') : ''}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                {currentUser.role === 'admin' && (
                  <>
                    <button 
                      onClick={() => setActiveTab('users')} 
                      className="btn btn-secondary mobile-only-btn" 
                      style={{ 
                        width: '100%',
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        gap: '6px', 
                        fontSize: '0.85rem', 
                        border: '1px solid var(--border-color)',
                        background: 'rgba(37, 99, 235, 0.05)',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Users size={14} color="var(--color-primary)" /> Kelola Petugas Lapangan
                    </button>
                    
                    <button 
                      onClick={() => setShowMediaTypeModal(true)} 
                      className="btn btn-secondary mobile-only-btn" 
                      style={{ 
                        width: '100%',
                        padding: '0.65rem', 
                        borderRadius: '8px', 
                        gap: '6px', 
                        fontSize: '0.85rem', 
                        border: '1px solid var(--border-color)',
                        background: 'rgba(37, 99, 235, 0.05)',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Layers size={14} color="var(--color-primary)" /> Kelola Tipe Media Promo
                    </button>
                  </>
                )}

                <button 
                  onClick={logout} 
                  className="btn btn-secondary" 
                  style={{ 
                    width: '100%',
                    padding: '0.65rem', 
                    borderRadius: '8px', 
                    gap: '6px', 
                    fontSize: '0.85rem', 
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    color: 'var(--color-danger)',
                    fontWeight: '600',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={14} color="var(--color-danger)" /> Keluar dari Akun
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Details Modal */}
      {selectedPromo && (
        <PromoDetailModal promo={selectedPromo} onClose={() => setSelectedPromo(null)} />
      )}

      {/* Global Edit Modal */}
      {editingPromo && (
        <div className="modal-overlay" onClick={() => setEditingPromo(null)} style={{ zIndex: 1010 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <PromoForm 
                promoToEdit={editingPromo} 
                onSaveSuccess={() => {
                  setEditingPromo(null);
                  refreshAppData();
                }} 
                currentUser={currentUser} 
                onCancel={() => setEditingPromo(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Type Management Modal */}
      {showMediaTypeModal && (
        <MediaTypeManagementModal onClose={() => setShowMediaTypeModal(false)} />
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

      </div>

      {/* Global Utilities */}
      <ToastContainer />
      <OfflineIndicator />
      <InstallPrompt />

      {/* Global Photo Preview Lightbox Modal */}
      {(() => {
        if (!previewPhoto) return null;
        const promo = previewPhoto.promo;
        const cond = promo ? (CONDITION_LABELS[promo.condition] || { text: promo.condition, color: 'var(--text-muted)', bg: 'transparent' }) : null;
        const hasMultiplePhotos = promo && promo.photoUrl && promo.conditionPhotoUrl;
        
        return (
          <div 
            onClick={() => setPreviewPhoto(null)}
            className="lightbox-overlay"
          >
            {/* Close Button - Fixed to Top-Right of Viewport */}
            <button
              onClick={() => setPreviewPhoto(null)}
              className="lightbox-close-btn"
            >
              <X size={22} />
            </button>

            {/* Centered Image Container with Touch events */}
            <div 
              onClick={e => e.stopPropagation()}
              className="lightbox-content"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Photo Frame Container */}
              <div className="lightbox-image-frame">
                {/* Image */}
                <img 
                  src={previewPhoto.url} 
                  alt={previewPhoto.title || (promo ? promo.outletName : 'Preview')}
                  onError={e => { e.target.src = '/uploads/placeholder-media.jpg'; }}
                  className="lightbox-image"
                />

                {/* Pagination Dots overlaying the bottom of the photo */}
                {hasMultiplePhotos && (
                  <div className="lightbox-dots">
                    <span 
                      className={`lightbox-dot ${previewPhoto.type === 'Saat Terpasang' ? 'active' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); navigateToType('Saat Terpasang'); }} 
                      title="Foto Saat Terpasang"
                    />
                    <span 
                      className={`lightbox-dot ${previewPhoto.type === 'Kondisi Terbaru' ? 'active' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); navigateToType('Kondisi Terbaru'); }} 
                      title="Foto Kondisi Terbaru"
                    />
                  </div>
                )}
              </div>

              {/* Glass Metadata Card */}
              {promo ? (
                <div className="lightbox-meta-card">
                  {previewPhoto.type === 'Saat Terpasang' ? (
                    <>
                      {/* Badge */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: '700', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          color: '#60a5fa', 
                          background: 'rgba(37, 99, 235, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid rgba(37, 99, 235, 0.25)'
                        }}>
                          {previewPhoto.type}
                        </span>
                      </div>
                      
                      {/* Outlet Name */}
                      <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', fontFamily: 'var(--font-display)', marginTop: '4px' }}>
                        {promo.outletName}
                      </div>

                      {/* Installation Date Row */}
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.35rem' }}>
                        <span><strong>Tanggal Pemasangan:</strong> {promo.installationDate ? promo.installationDate.split('-').reverse().join('-') : '-'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Badge */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: '700', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          color: '#60a5fa', 
                          background: 'rgba(37, 99, 235, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid rgba(37, 99, 235, 0.25)'
                        }}>
                          {previewPhoto.type}
                        </span>
                      </div>
                      
                      {/* Outlet Name */}
                      <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', fontFamily: 'var(--font-display)', marginTop: '4px' }}>
                        {promo.outletName}
                      </div>

                      {/* Metadata Row: Kondisi & Tanggal Update */}
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.35rem', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: '700', 
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: cond.bg,
                          color: cond.color,
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          Kondisi: {cond.text}
                        </span>
                        <span>·</span>
                        <span><strong>Tanggal Update:</strong> {promo.conditionModifiedAt ? new Date(promo.conditionModifiedAt).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '-'}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Fallback Title Card */
                <div className="lightbox-fallback-card">
                  {previewPhoto.title}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
