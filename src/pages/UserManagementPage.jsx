import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Shield, User, X, Pencil } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';

export default function UserManagementPage({ onBack }) {
  const { addToast } = useApp();
  const [usersList, setUsersList] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    name: ''
  });
  const [selectedRegencies, setSelectedRegencies] = useState([]);
  const [tempProvince, setTempProvince] = useState({ id: '', name: '' });
  const [tempRegency, setTempRegency] = useState({ id: '', name: '' });
  const [editUserId, setEditUserId] = useState(null);

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
    const provName = adminProvList.find(p => p.id === provId)?.name || '';
    
    setTempProvince({ id: provId, name: provName });
    setTempRegency({ id: '', name: '' });
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
    const regName = adminRegList.find(r => r.id === regId)?.name || '';
    const formattedRegName = regName.replace(/^KABUPATEN\b/gi, 'KAB.');
    setTempRegency({ id: regId, name: formattedRegName });
  };

  const handleAddRegency = () => {
    if (!tempProvince.id || !tempRegency.id) {
      addToast('Pilih Provinsi dan Kabupaten / Kota terlebih dahulu!', 'warning');
      return;
    }
    const exists = selectedRegencies.some(r => r.regencyId === tempRegency.id);
    if (exists) {
      addToast('Wilayah ini sudah ditambahkan!', 'warning');
      return;
    }
    setSelectedRegencies(prev => [
      ...prev,
      {
        provinceId: tempProvince.id,
        provinceName: tempProvince.name,
        regencyId: tempRegency.id,
        regencyName: tempRegency.name
      }
    ]);
    setTempRegency({ id: '', name: '' });
  };

  const handleRemoveRegency = (regencyId) => {
    setSelectedRegencies(prev => prev.filter(r => r.regencyId !== regencyId));
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newUserData.username || !newUserData.name || (!editUserId && !newUserData.password)) {
      addToast('Nama, Username, dan Password wajib diisi!', 'warning');
      return;
    }

    let assignedProvinceId = '';
    let assignedProvinceName = 'Semua';
    let assignedRegencyId = '';
    let assignedRegencyName = 'Semua';

    if (selectedRegencies.length > 0) {
      assignedProvinceId = selectedRegencies.map(r => r.provinceId).join(',');
      assignedProvinceName = selectedRegencies.map(r => r.provinceName).join(',');
      assignedRegencyId = selectedRegencies.map(r => r.regencyId).join(',');
      assignedRegencyName = selectedRegencies.map(r => r.regencyName).join(',');
    }

    const payload = {
      username: newUserData.username,
      name: newUserData.name,
      assignedProvinceId,
      assignedProvinceName,
      assignedRegencyId,
      assignedRegencyName
    };
    if (newUserData.password && newUserData.password.trim() !== '') {
      payload.password = newUserData.password;
    }

    try {
      if (editUserId) {
        await api.updateUser(editUserId, payload);
        addToast('Data petugas berhasil diperbarui!', 'success');
      } else {
        await api.createUser({ ...payload, password: newUserData.password });
        addToast('Petugas baru berhasil didaftarkan!', 'success');
      }
      setShowAddUserModal(false);
      setEditUserId(null);
      setNewUserData({
        username: '',
        password: '',
        name: ''
      });
      setSelectedRegencies([]);
      setTempProvince({ id: '', name: '' });
      setTempRegency({ id: '', name: '' });
      setAdminRegList([]);
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Gagal menyimpan data petugas', 'error');
    }
  };

  const handleEditUserClick = (user) => {
    setEditUserId(user.id);
    setNewUserData({
      username: user.username,
      password: '',
      name: user.name
    });

    const regIds = (user.assignedRegencyId || '').split(',').filter(Boolean);
    const regNames = (user.assignedRegencyName || '').split(',').filter(Boolean);
    const provIds = (user.assignedProvinceId || '').split(',').filter(Boolean);
    const provNames = (user.assignedProvinceName || '').split(',').filter(Boolean);

    const parsed = regIds.map((id, idx) => ({
      provinceId: provIds[idx] || provIds[0] || '',
      provinceName: provNames[idx] || provNames[0] || '',
      regencyId: id,
      regencyName: regNames[idx] || ''
    }));

    setSelectedRegencies(parsed);
    setTempProvince({ id: '', name: '' });
    setTempRegency({ id: '', name: '' });
    setShowAddUserModal(true);
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
      {onBack && (
        <button 
          onClick={onBack} 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', border: '1px solid var(--border-color)' }}
        >
          ← Kembali ke Profil
        </button>
      )}
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
              <th>Wilayah Kerja</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.id}>
                <td data-label="Nama"><strong style={{ color: 'var(--text-main)' }}>{u.name}</strong></td>
                <td data-label="Wilayah Kerja">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {u.assignedRegencyName === 'Semua' || !u.assignedRegencyName ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>Nasional (Semua Wilayah)</span>
                    ) : (
                      u.assignedRegencyName.split(',').map((r, i) => {
                        const provName = u.assignedProvinceName.split(',')[i] || '';
                        return (
                          <span key={i} className="badge" style={{
                            background: 'rgba(14,165,233,0.15)',
                            color: 'var(--color-info)',
                            border: '1px solid rgba(14,165,233,0.25)',
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {provName} - {r}
                          </span>
                        );
                      })
                    )}
                  </div>
                </td>
                <td data-label="Aksi" style={{ textAlign: 'center' }}>
                  {u.role !== 'admin' ? (
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'rgba(37,99,235,0.05)', color: 'var(--color-primary)' }}
                        title="Edit Akun"
                        onClick={() => handleEditUserClick(u)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        className="btn btn-danger-outline" 
                        style={{ padding: '0.35rem', borderRadius: '4px' }}
                        title="Hapus Akun"
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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

    {/* Modal: Tambah/Edit Petugas (Admin Only) */}
    {showAddUserModal && (
        <div className="modal-overlay" onClick={() => { setShowAddUserModal(false); setEditUserId(null); setSelectedRegencies([]); setTempProvince({ id: '', name: '' }); setTempRegency({ id: '', name: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editUserId ? <Pencil size={20} color="var(--color-primary)" /> : <PlusCircle size={20} color="var(--color-primary)" />} 
                {editUserId ? 'Edit Petugas Lapangan' : 'Daftarkan Petugas Baru'}
              </h3>
              <button className="modal-close" onClick={() => { setShowAddUserModal(false); setEditUserId(null); setSelectedRegencies([]); setTempProvince({ id: '', name: '' }); setTempRegency({ id: '', name: '' }); }}><X size={18} /></button>
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
                  <label className="form-label">{editUserId ? 'Password Baru' : 'Password *'}</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder={editUserId ? "Kosongkan jika tidak ingin diubah" : "Masukkan password petugas"}
                    value={newUserData.password}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                    required={!editUserId}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'white', marginBottom: '0.75rem' }}>Hak Akses Wilayah Kerja</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                    {/* Provinsi */}
                    <div className="form-group">
                      <label className="form-label">Provinsi</label>
                      <select
                        className="form-control select-input"
                        value={tempProvince.id}
                        onChange={handleAdminProvinceChange}
                        style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Pilih Provinsi --</option>
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
                        value={tempRegency.id}
                        onChange={handleAdminRegencyChange}
                        disabled={!tempProvince.id}
                        style={{ padding: '0.65rem 0.5rem', fontSize: '0.85rem' }}
                      >
                        <option value="">-- Pilih Kota/Kab --</option>
                        {adminRegList.map(reg => (
                          <option key={reg.id} value={reg.id}>
                            {reg.name.replace(/^KABUPATEN\b/gi, 'KAB.')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddRegency}
                      style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <PlusCircle size={14} /> Tambah Wilayah
                    </button>
                  </div>

                  {/* Selected Regencies List */}
                  <div style={{ marginTop: '1rem', background: 'rgba(15,23,42,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                      Wilayah Kerja Terpilih ({selectedRegencies.length}):
                    </label>
                    {selectedRegencies.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Belum ada wilayah terpilih (Petugas dapat mengakses Semua Wilayah)
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {selectedRegencies.map(reg => (
                          <span
                            key={reg.regencyId}
                            style={{
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(37,99,235,0.15)',
                              color: 'var(--color-primary)',
                              border: '1px solid rgba(37,99,235,0.25)',
                              fontWeight: '600'
                            }}
                          >
                            {reg.provinceName} - {reg.regencyName}
                            <button
                              type="button"
                              onClick={() => handleRemoveRegency(reg.regencyId)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: 0
                              }}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    * Petugas ini hanya akan diizinkan mendata dan melihat data promo pada wilayah Kabupaten / Kota di atas.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowAddUserModal(false); setEditUserId(null); setSelectedRegencies([]); setTempProvince({ id: '', name: '' }); setTempRegency({ id: '', name: '' }); }}>Batal</button>
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
