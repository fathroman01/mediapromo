import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Shield, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';

export default function UserManagementPage() {
  const { addToast } = useApp();
  const [usersList, setUsersList] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    name: '',
    assignedProvinceId: '',
    assignedProvinceName: 'Semua',
    assignedRegencyId: '',
    assignedRegencyName: 'Semua'
  });

  const [adminProvList, setAdminProvList] = useState([]);
  const [adminRegList, setAdminRegList] = useState([]);
  const [loadingAdminGeo, setLoadingAdminGeo] = useState({ prov: false, reg: false });

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsersList(data);
    } catch (err) {
      addToast('Gagal memuat daftar petugas.', 'error');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Load provinces for user creation modal
  useEffect(() => {
    if (showAddUserModal) {
      const fetchAdminProvinces = async () => {
        try {
          setLoadingAdminGeo(prev => ({ ...prev, prov: true }));
          const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
          if (res.ok) {
            const data = await res.json();
            setAdminProvList(data.sort((a, b) => a.name.localeCompare(b.name)));
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingAdminGeo(prev => ({ ...prev, prov: false }));
        }
      };
      fetchAdminProvinces();
    }
  }, [showAddUserModal]);

  const handleAdminProvinceChange = async (e) => {
    const provId = e.target.value;
    const provName = adminProvList.find(p => p.id === provId)?.name || 'Semua';
    
    setNewUserData(prev => ({
      ...prev,
      assignedProvinceId: provId,
      assignedProvinceName: provName,
      assignedRegencyId: '',
      assignedRegencyName: 'Semua'
    }));
    setAdminRegList([]);

    if (!provId) return;

    try {
      setLoadingAdminGeo(prev => ({ ...prev, reg: true }));
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
      if (res.ok) {
        const data = await res.json();
        setAdminRegList(data.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAdminGeo(prev => ({ ...prev, reg: false }));
    }
  };

  const handleAdminRegencyChange = (e) => {
    const regId = e.target.value;
    const regName = adminRegList.find(r => r.id === regId)?.name || 'Semua';
    const formattedRegName = regName.replace(/^KABUPATEN\b/gi, 'KAB.');
    setNewUserData(prev => ({
      ...prev,
      assignedRegencyId: regId,
      assignedRegencyName: formattedRegName
    }));
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.password || !newUserData.name) {
      addToast('Nama, Username, dan Password wajib diisi!', 'warning');
      return;
    }

    try {
      await api.createUser(newUserData);
      addToast('Petugas baru berhasil ditambahkan!', 'success');
      setShowAddUserModal(false);
      setNewUserData({
        username: '',
        password: '',
        name: '',
        assignedProvinceId: '',
        assignedProvinceName: 'Semua',
        assignedRegencyId: '',
        assignedRegencyName: 'Semua'
      });
      setAdminRegList([]);
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Gagal menambahkan petugas', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus petugas ini?')) {
      try {
        await api.deleteUser(id);
        addToast('Petugas berhasil dihapus!', 'success');
        loadUsers();
      } catch (err) {
        addToast(err.message || 'Gagal menghapus petugas', 'error');
      }
    }
  };

  return (
    <>
      <div className="glass-card">
      <div className="table-controls" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', color: 'white', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Manajemen Akses Wilayah & Petugas
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Daftarkan petugas lapangan baru dan tentukan hak akses kabupaten/kota kerja mereka.
          </p>
        </div>
        <button onClick={() => setShowAddUserModal(true)} className="btn btn-primary">
          <PlusCircle size={16} /> Tambah Petugas
        </button>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nama Lengkap</th>
              <th>Username</th>
              <th>Peran (Role)</th>
              <th>Wilayah Kerja</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.id}>
                <td data-label="Nama"><strong style={{ color: 'white' }}>{u.name}</strong></td>
                <td data-label="Username"><code>{u.username}</code></td>
                <td data-label="Peran">
                  <span className="badge" style={{
                    background: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'rgba(99,102,241,0.15)',
                    color: u.role === 'admin' ? 'var(--color-secondary)' : 'var(--color-primary)',
                    border: u.role === 'admin' ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(99,102,241,0.25)'
                  }}>
                    {u.role === 'admin' ? 'Administrator' : 'Petugas Lapangan'}
                  </span>
                </td>
                <td data-label="Wilayah Kerja">
                  <span style={{ color: u.assignedRegencyName === 'Semua' ? 'var(--color-success)' : 'var(--color-info)', fontWeight: '600' }}>
                    {u.assignedRegencyName === 'Semua' ? 'Nasional (Semua Wilayah)' : `${u.assignedProvinceName} - ${u.assignedRegencyName}`}
                  </span>
                </td>
                <td data-label="Aksi" style={{ textAlign: 'center' }}>
                  {u.role !== 'admin' ? (
                    <button 
                      className="btn btn-danger-outline" 
                      style={{ padding: '0.35rem', borderRadius: '4px' }}
                      title="Hapus Akun"
                      onClick={() => handleDeleteUser(u.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Bawaan</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Modal: Tambah Petugas (Admin Only) */}
    {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={20} color="var(--color-primary)" /> Daftarkan Petugas Baru
              </h3>
              <button className="modal-close" onClick={() => setShowAddUserModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: Caca Handika"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username Login *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Contoh: caca"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Masukkan password petugas"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '0.75rem' }}>Hak Akses Wilayah Kerja</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {/* Provinsi */}
                    <div className="form-group">
                      <label className="form-label">Provinsi</label>
                      <select
                        className="form-control select-input"
                        value={newUserData.assignedProvinceId}
                        onChange={handleAdminProvinceChange}
                        style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Semua Provinsi --</option>
                        {adminProvList.map(prov => (
                          <option key={prov.id} value={prov.id}>{prov.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Kabupaten / Kota */}
                    <div className="form-group">
                      <label className="form-label">Kabupaten / Kota</label>
                      <select
                        className="form-control select-input"
                        value={newUserData.assignedRegencyId}
                        onChange={handleAdminRegencyChange}
                        disabled={!newUserData.assignedProvinceId}
                        style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Semua Kota/Kabupaten --</option>
                        {adminRegList.map(reg => (
                          <option key={reg.id} value={reg.id}>
                            {reg.name.replace(/^KABUPATEN\b/gi, 'KAB.')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    * Petugas ini hanya akan diizinkan mendata dan melihat data promo pada wilayah Kabupaten / Kota di atas.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary">Simpan Petugas</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
