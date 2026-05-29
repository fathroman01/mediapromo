import React, { createContext, useContext, useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { dbService } from '../services/dbService';
import { api } from '../services/api';
import { logger } from '../utils/logger';
import { MEDIA_TYPES } from '../constants';

const AppContext = createContext();

export function AppProvider({ children }) {
  const isOnline = useOnlineStatus();
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('promo_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [mediaTypes, setMediaTypes] = useState(MEDIA_TYPES);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [networkIpInfo, setNetworkIpInfo] = useState({ localIp: '', port: 5000 });

  // Toast System
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Get local network IP details for scanner
  useEffect(() => {
    const loadIpDetails = async () => {
      const info = await api.getNetworkIp();
      const port = window.location.port === '5173' ? '5000' : window.location.port || '5000';
      setNetworkIpInfo({ localIp: info.localIp, port });
    };
    loadIpDetails();
  }, []);

  // Sync Queue Counter updater
  const updateQueueCount = async () => {
    try {
      const queue = await dbService.getQueue();
      setSyncQueueCount(queue.length);
    } catch (err) {
      logger.error('Failed to get offline queue count', err);
    }
  };

  useEffect(() => {
    dbService.initDB().then(() => {
      updateQueueCount();
    });
  }, []);

  // Fetch Promo Media & Stats
  const refreshAppData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [itemsData, statsData, mediaTypesData] = await Promise.all([
        api.getPromoMedia(currentUser),
        api.getStats(currentUser),
        api.getMediaTypes().catch(() => MEDIA_TYPES) // fallback
      ]);
      setItems(itemsData);
      setStats(statsData);
      if (mediaTypesData && mediaTypesData.length > 0) {
        setMediaTypes(mediaTypesData);
      }
      try {
        await dbService.cachePromos(itemsData);
      } catch (dbErr) {
        logger.error('Gagal menyimpan cache data ke IndexedDB:', dbErr);
      }
    } catch (error) {
      logger.error('Error refreshing app data from server:', error);
      addToast('Gagal memuat data terbaru dari server. Menampilkan data lokal offline.', 'warning');
      try {
        const cachedItems = await dbService.getCachedPromos();
        setItems(cachedItems);
      } catch (dbErr) {
        logger.error('Gagal mengambil data cache dari IndexedDB:', dbErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sync offline queue
  const syncOfflineData = async () => {
    if (!isOnline || isSyncing) return;
    try {
      const queue = await dbService.getQueue();
      if (queue.length === 0) return;

      setIsSyncing(true);
      addToast(`Menyinkronkan ${queue.length} pendataan tertunda...`, 'info');
      logger.log(`Syncing ${queue.length} offline elements...`);

      let successCount = 0;
      for (const item of queue) {
        try {
          const formData = new FormData();
          
          // Append standard fields, serialize object types
          Object.keys(item).forEach(key => {
            if (!['photo', 'id', 'queuedAt'].includes(key) && item[key] !== undefined) {
              if (typeof item[key] === 'object' && item[key] !== null) {
                formData.append(key, JSON.stringify(item[key]));
              } else {
                formData.append(key, item[key]);
              }
            }
          });

          if (item.photo) {
            formData.append('photo', item.photo);
          }

          await api.savePromoMedia(formData);
          await dbService.deleteFromQueue(item.id);
          successCount++;
        } catch (e) {
          logger.error(`Failed to sync queued item ${item.outletName}:`, e);
        }
      }

      await updateQueueCount();
      setIsSyncing(false);
      
      if (successCount > 0) {
        addToast(`Sinkronisasi berhasil! ${successCount} data dikirim ke server.`, 'success');
        refreshAppData();
      }
    } catch (err) {
      logger.error('Sync queue loop error:', err);
      setIsSyncing(false);
    }
  };

  // Trigger sync on online connection shift
  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    } else {
      addToast('Aplikasi berjalan dalam mode Offline.', 'warning');
    }
  }, [isOnline]);

  // Refresh items when current user logins/logouts
  useEffect(() => {
    if (currentUser) {
      refreshAppData();
      updateQueueCount();
    } else {
      setItems([]);
      setStats(null);
    }
  }, [currentUser]);

  // Auth operations
  const login = async (username, password) => {
    try {
      const data = await api.login(username, password);
      localStorage.setItem('promo_user', JSON.stringify(data));
      setCurrentUser(data);
      setActiveTab('dashboard');
      addToast(`Selamat datang kembali, ${data.name}!`, 'success');
      return true;
    } catch (err) {
      logger.error('Login action failed', err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('promo_user');
    setCurrentUser(null);
    setActiveTab('dashboard');
    addToast('Anda telah keluar dari sistem.', 'info');
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      activeTab,
      setActiveTab,
      items,
      setItems,
      stats,
      setStats,
      mediaTypes,
      setMediaTypes,
      isLoading,
      setIsLoading,
      isOnline,
      toasts,
      addToast,
      removeToast,
      syncQueueCount,
      updateQueueCount,
      isSyncing,
      syncOfflineData,
      networkIpInfo,
      refreshAppData,
      login,
      logout
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
