const DB_NAME = 'MediaPromoST_DB';
const DB_VERSION = 2;

export const dbService = {
  db: null,

  initDB() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('cached_promo')) {
          db.createObjectStore('cached_promo', { keyPath: 'id' });
        }
        // Store baru untuk cache data wilayah (kecamatan, desa)
        if (!db.objectStoreNames.contains('cached_geo')) {
          db.createObjectStore('cached_geo', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(new Error('Gagal menginisialisasi IndexedDB: ' + event.target.error));
      };
    });
  },

  async getStore(storeName, mode = 'readonly') {
    const db = await this.initDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  },

  async addToQueue(item) {
    const store = await this.getStore('offline_queue', 'readwrite');
    return new Promise((resolve, reject) => {
      const queueItem = {
        ...item,
        queuedAt: new Date().toISOString()
      };
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async getQueue() {
    const store = await this.getStore('offline_queue', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteFromQueue(id) {
    const store = await this.getStore('offline_queue', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async cachePromos(items) {
    const store = await this.getStore('cached_promo', 'readwrite');
    return new Promise((resolve, reject) => {
      store.clear().onsuccess = () => {
        let count = 0;
        if (!items || items.length === 0) return resolve();
        
        items.forEach(item => {
          const request = store.put(item);
          request.onsuccess = () => {
            count++;
            if (count === items.length) resolve();
          };
          request.onerror = (e) => reject(e.target.error);
        });
      };
    });
  },

  async getCachedPromos() {
    const store = await this.getStore('cached_promo', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Simpan data wilayah ke IndexedDB
  // key contoh: 'districts_3204', 'villages_3204010'
  async cacheGeoData(key, data) {
    const store = await this.getStore('cached_geo', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, data, cachedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  // Ambil data wilayah dari IndexedDB
  async getCachedGeoData(key) {
    const store = await this.getStore('cached_geo', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }
};
