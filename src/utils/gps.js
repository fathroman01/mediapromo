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

  getCurrentLocation: async (options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }) => {
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
              if (err.code === 1) {
                msg = 'Izin lokasi GPS ditolak. Silakan aktifkan di pengaturan browser/HP Anda.';
              } else if (err.code === 3) {
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
  },

  /**
   * Ambil lokasi terbaik dengan retry hingga maxAttempts kali.
   * Setiap pembacaan dibandingkan — yang paling akurat (accuracy terkecil) yang dipakai.
   * Berhenti lebih awal jika sudah mencapai targetAccuracy meter.
   *
   * @param {Function|null} onProgress  - callback(attempt, accuracy) untuk update UI real-time
   * @param {number}        maxAttempts - maks percobaan (default 3)
   * @param {number}        targetAccuracy - berhenti jika akurasi <= nilai ini (default 30 meter)
   */
  getBestLocation: async (onProgress = null, maxAttempts = 3, targetAccuracy = 30) => {
    let best = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const coords = await gps.getCurrentLocation({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });

        if (onProgress) onProgress(attempt, coords.accuracy);

        // Simpan jika lebih akurat dari sebelumnya
        if (!best || coords.accuracy < best.accuracy) {
          best = coords;
        }

        // Berhenti lebih awal jika sudah cukup akurat
        if (best.accuracy <= targetAccuracy) break;

        // Jeda singkat antar percobaan agar GPS sinyal stabil
        if (attempt < maxAttempts) {
          await new Promise(res => setTimeout(res, 1500));
        }
      } catch (err) {
        console.warn(`GPS attempt ${attempt} failed:`, err.message);
        // Jika percobaan terakhir masih gagal dan tidak ada data, lempar error
        if (attempt === maxAttempts && !best) throw err;
      }
    }

    if (!best) throw new Error('Gagal mendapatkan lokasi GPS setelah beberapa percobaan.');
    return best;
  },

  /**
   * Mengembalikan label kualitas dan warna berdasarkan nilai akurasi (meter).
   * Digunakan untuk menampilkan indikator visual di form.
   */
  getAccuracyLabel: (accuracyMeters) => {
    if (accuracyMeters === null || accuracyMeters === undefined) {
      return { label: 'Tidak diketahui', color: '#94a3b8', emoji: '⚪' };
    }
    if (accuracyMeters <= 10)  return { label: `±${Math.round(accuracyMeters)}m — Sangat Akurat`, color: '#10b981', emoji: '🟢' };
    if (accuracyMeters <= 30)  return { label: `±${Math.round(accuracyMeters)}m — Akurat`,        color: '#10b981', emoji: '🟢' };
    if (accuracyMeters <= 100) return { label: `±${Math.round(accuracyMeters)}m — Cukup Akurat`,  color: '#f59e0b', emoji: '🟡' };
    if (accuracyMeters <= 500) return { label: `±${Math.round(accuracyMeters)}m — Kurang Akurat`, color: '#f97316', emoji: '🟠' };
    return                            { label: `±${Math.round(accuracyMeters)}m — Tidak Akurat`,  color: '#ef4444', emoji: '🔴' };
  }
};
