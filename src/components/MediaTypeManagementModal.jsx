import React, { useState } from 'react';
import { X, Plus, Trash2, Layers } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';

export default function MediaTypeManagementModal({ onClose }) {
  const { mediaTypes, setMediaTypes, addToast } = useApp();
  const [newType, setNewType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    const val = newType.trim();
    if (!val) return;

    setIsSubmitting(true);
    try {
      const res = await api.addMediaType(val);
      if (res.data) {
        setMediaTypes(res.data);
        setNewType('');
        addToast(res.message || 'Tipe media berhasil ditambahkan', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Gagal menambahkan tipe media', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Hapus tipe media "${type}"?`)) return;

    try {
      const res = await api.deleteMediaType(type);
      if (res.data) {
        setMediaTypes(res.data);
        addToast(res.message || 'Tipe media berhasil dihapus', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Gagal menghapus tipe media', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="var(--color-primary)" /> Kelola Tipe Media Promo
          </h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="text-input"
              style={{ flex: 1 }}
              placeholder="Tambah tipe media baru..."
              value={newType}
              onChange={e => setNewType(e.target.value)}
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting || !newType.trim()}
              style={{ padding: '0.5rem 1rem' }}
            >
              <Plus size={16} /> Tambah
            </button>
          </form>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            {mediaTypes.map((type, idx) => (
              <div 
                key={type} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.75rem 1rem',
                  borderBottom: idx === mediaTypes.length - 1 ? 'none' : '1px solid var(--border-color)'
                }}
              >
                <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{type}</span>
                <button 
                  onClick={() => handleDelete(type)}
                  className="btn btn-danger-outline"
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', border: 'none' }}
                  title="Hapus tipe media"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {mediaTypes.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Belum ada tipe media
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
