Refactor dan upgrade project web yang sudah ada menjadi aplikasi PWA production-ready dengan struktur kode yang lebih rapi, modular, scalable, dan mudah maintenance/debug.

Jangan mengubah fungsi utama yang sudah berjalan.
Fokus pada:
- perapihan struktur project
- pemisahan logic
- optimasi performa
- peningkatan maintainability
- penambahan fitur PWA
- peningkatan error handling

Lakukan analisa struktur project terlebih dahulu lalu refactor secara bertahap tanpa merusak fitur existing.

Target hasil:
- kode lebih bersih
- modular
- mudah dikembangkan
- mudah debug
- mobile-first
- installable sebagai PWA

Refactor struktur folder menjadi seperti:

src/
 ├── components/
 ├── pages/
 ├── layouts/
 ├── services/
 ├── hooks/
 ├── store/
 ├── utils/
 ├── constants/
 ├── config/
 ├── validators/
 ├── models/
 ├── pwa/
 ├── assets/
 └── styles/

Yang perlu diperbaiki:
- Pisahkan UI dan business logic
- Pisahkan API service
- Pisahkan utility/helper
- Hindari duplicate code
- Pecah file besar menjadi module kecil
- Gunakan reusable component
- Rapikan naming file dan function
- Tambahkan centralized config dan constants

Tambahkan system debugging:
- logging system
- global error handling
- loading state
- retry mechanism
- toast/error notification
- network status detection

Upgrade menjadi PWA:
- Tambahkan manifest.json
- Tambahkan service worker modular
- Tambahkan offline cache
- Tambahkan install app support
- Tambahkan splash screen
- Tambahkan standalone fullscreen mode
- Tambahkan offline fallback page

Offline features:
- Simpan data sementara saat offline
- Queue upload offline
- Auto sync saat online kembali
- Gunakan IndexedDB

Untuk fitur upload:
- Kompres image otomatis sebelum upload
- Pisahkan image service
- Tambahkan upload progress
- Handle gagal upload

Untuk GPS:
- Gunakan utility GPS terpisah
- Handle permission denied
- Simpan timestamp lokasi
- Optimalkan akurasi lokasi

Performance:
- Lazy loading page
- Lazy loading image
- Cache asset penting
- Optimasi mobile Android menengah
- Kurangi render tidak perlu

Security:
- Validasi input
- Sanitasi data
- HTTPS ready
- Handle auth token dengan aman

UI/UX:
- Pertahankan tampilan existing jika sudah baik
- Rapikan layout mobile
- Tambahkan feedback loading/error
- Optimalkan penggunaan satu tangan di HP

Penting:
- Jangan merusak fitur existing
- Lakukan perubahan bertahap
- Tambahkan komentar pada logic penting
- Jelaskan file yang diubah
- Jelaskan alasan refactor
- Buat code lebih mudah dipahami developer pemula

Di akhir:
- tampilkan struktur project final
- tampilkan flow aplikasi
- tampilkan bagian yang sudah dioptimasi
- tampilkan bagian yang perlu maintenance berkala