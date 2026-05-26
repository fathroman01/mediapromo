import { Geolocation } from '@capacitor/geolocation';

export const gps = {
  checkPermissions: async () => {
    try {
      const check = await Geolocation.checkPermissions();
      return check.location;
    } catch (e) {
      throw new Error('Gagal memeriksa izin GPS: ' + e.message);
    }
  },
  
  requestPermissions: async () => {
    try {
      const request = await Geolocation.requestPermissions();
      return request.location;
    } catch (e) {
      throw new Error('Gagal meminta izin GPS: ' + e.message);
    }
  },

  getCurrentLocation: async (options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) => {
    try {
      try {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
      } catch (permError) {
        // Ignore permission checks not implemented on web browser
        console.warn('Capacitor permissions API not supported/implemented on this platform, skipping checks.');
      }
      
      const position = await Geolocation.getCurrentPosition(options);
      if (position && position.coords) {
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now()
        };
      }
      throw new Error('Data koordinat GPS kosong.');
    } catch (error) {
      // Fallback to native browser navigator.geolocation
      if (navigator.geolocation) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: pos.timestamp || Date.now()
              });
            },
            (err) => {
              let msg = 'Gagal mendeteksi lokasi GPS perangkat.';
              if (err.code === 1) { // PERMISSION_DENIED
                msg = 'Izin lokasi GPS ditolak. Silakan aktifkan di pengaturan browser/HP Anda.';
              } else if (err.code === 3) { // TIMEOUT
                msg = 'Waktu pencarian lokasi habis (GPS lemah/tidak aktif). Coba lagi di ruang terbuka.';
              } else {
                msg = err.message || msg;
              }
              reject(new Error(msg));
            },
            options
          );
        });
      }

      console.error('GPS Utility Error:', error);
      let msg = 'Gagal mendeteksi lokasi GPS perangkat.';
      if (error && error.message) {
        if (error.message.includes('denied') || error.message.includes('permission')) {
          msg = 'Izin lokasi GPS ditolak. Silakan aktifkan di pengaturan browser/HP Anda.';
        } else if (error.message.includes('timeout')) {
          msg = 'Waktu pencarian lokasi habis (GPS lemah/tidak aktif). Coba lagi di ruang terbuka.';
        } else {
          msg = error.message;
        }
      }
      throw new Error(msg);
    }
  }
};
