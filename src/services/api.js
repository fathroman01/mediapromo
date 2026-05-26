import { dbService } from './dbService';
import { logger } from '../utils/logger';

const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      logger.warn(`API call failed. Retrying in ${delay}ms... (${retries} attempts left)`, error);
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    logger.error(`API call failed after all retries.`, error);
    throw error;
  }
};

export const api = {
  async login(username, password) {
    const res = await fetchWithRetry('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }, 0);
    return res.json();
  },

  async getNetworkIp() {
    try {
      const res = await fetch('/api/network-ip');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      logger.warn('Failed to retrieve network IP from server:', e);
    }
    return { localIp: window.location.hostname };
  },

  async getPromoMedia(currentUser) {
    let url = '/api/promo-media';
    if (currentUser?.role === 'officer' && currentUser?.assignedRegencyName) {
      url += `?regency=${encodeURIComponent(currentUser.assignedRegencyName)}`;
    }

    try {
      const res = await fetchWithRetry(url, {}, 2, 500);
      const data = await res.json();
      dbService.cachePromos(data).catch(err => logger.error('Cache promos failure', err));
      return data;
    } catch (error) {
      logger.warn('Fetching promo media from network failed. Loading from IndexedDB cache...', error);
      const cached = await dbService.getCachedPromos();
      if (cached && cached.length > 0) {
        return cached;
      }
      throw error;
    }
  },

  async getStats(currentUser) {
    let url = '/api/stats';
    if (currentUser?.role === 'officer' && currentUser?.assignedRegencyName) {
      url += `?regency=${encodeURIComponent(currentUser.assignedRegencyName)}`;
    }
    try {
      const res = await fetchWithRetry(url, {}, 2, 500);
      return res.json();
    } catch (error) {
      logger.warn('Failed to fetch stats. Computing fallback stats offline.', error);
      const cached = await dbService.getCachedPromos();
      return this.computeOfflineStats(cached);
    }
  },

  computeOfflineStats(data) {
    const stats = {
      totalMedia: 0,
      totalOutlets: new Set(data.map(item => item.outletName)).size,
      conditions: {
        Good: 0,
        Damaged: 0,
        'Needs Replacement': 0,
        Missing: 0
      },
      mediaTypes: {
        Banner: 0,
        Pamflet: 0,
        Sticker: 0
      },
      expiringSoon: 0,
      expired: 0
    };

    const now = new Date();

    data.forEach(item => {
      if (Array.isArray(item.mediaItems) && item.mediaItems.length > 0) {
        item.mediaItems.forEach(m => {
          const t = m.type || 'Banner';
          const q = parseInt(m.quantity) || 1;
          stats.totalMedia += q;
          stats.mediaTypes[t] = (stats.mediaTypes[t] || 0) + q;
        });

        const totalItemQty = item.mediaItems.reduce((acc, m) => acc + (parseInt(m.quantity) || 1), 0);
        if (stats.conditions[item.condition] !== undefined) {
          stats.conditions[item.condition] += totalItemQty;
        }
      } else {
        const q1 = item.quantity ? parseInt(item.quantity) : 1;
        const q2 = (item.hasSecondMedia && item.quantity2) ? parseInt(item.quantity2) : 0;
        stats.totalMedia += (q1 + q2);

        if (stats.conditions[item.condition] !== undefined) {
          stats.conditions[item.condition] += q1;
        }

        if (item.mediaType) {
          stats.mediaTypes[item.mediaType] = (stats.mediaTypes[item.mediaType] || 0) + q1;
        }

        if (item.hasSecondMedia && item.mediaType2) {
          stats.mediaTypes[item.mediaType2] = (stats.mediaTypes[item.mediaType2] || 0) + q2;
        }
      }

      if (item.expiryDate) {
        const expiry = new Date(item.expiryDate);
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          stats.expired++;
        } else if (diffDays <= 7) {
          stats.expiringSoon++;
        }
      }
    });

    return stats;
  },

  async savePromoMedia(formData) {
    const res = await fetchWithRetry('/api/promo-media', {
      method: 'POST',
      body: formData
    }, 2, 1000);
    return res.json();
  },

  async updatePromoStatus(id, condition) {
    const res = await fetchWithRetry(`/api/promo-media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition })
    }, 2, 1000);
    return res.json();
  },

  async deletePromo(id) {
    const res = await fetchWithRetry(`/api/promo-media/${id}`, {
      method: 'DELETE'
    }, 2, 1000);
    return res.json();
  },

  async getUsers() {
    const res = await fetchWithRetry('/api/users', {}, 2, 500);
    return res.json();
  },

  async createUser(userData) {
    const res = await fetchWithRetry('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }, 1, 1000);
    return res.json();
  },

  async deleteUser(id) {
    const res = await fetchWithRetry(`/api/users/${id}`, {
      method: 'DELETE'
    }, 1, 1000);
    return res.json();
  }
};
