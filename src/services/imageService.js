import { compressImage } from '../utils/imageCompressor';
import { logger } from '../utils/logger';

export const imageService = {
  async compressPhoto(file) {
    if (!file) return null;
    logger.log('Compressing image client-side...', file.name);
    try {
      const compressed = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.7 });
      logger.success(`Compressed! Size reduced from ${(file.size / 1024).toFixed(1)}KB to ${(compressed.size / 1024).toFixed(1)}KB`);
      return compressed;
    } catch (e) {
      logger.error('Failed to compress image, using original file instead.', e);
      return file;
    }
  },

  uploadWithProgress(formData, onProgress, url = '/api/promo-media', method = 'POST') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          if (onProgress) onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch (e) {
            resolve({ message: 'Upload success', data: xhr.responseText });
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res.message || `Upload failed with status ${xhr.status}`));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Koneksi terputus saat mengunggah foto.'));
      });

      xhr.send(formData);
    });
  }
};
