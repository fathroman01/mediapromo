import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths configuration
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'promo_media.json');
const usersPath = path.join(dbDir, 'users.json');
const uploadDir = path.join(__dirname, 'uploads');

const defaultUsers = [
  {
    id: "user-admin",
    username: "admin",
    password: "admin",
    name: "Administrator Pusat",
    role: "admin",
    assignedProvinceId: "",
    assignedProvinceName: "Semua",
    assignedRegencyId: "",
    assignedRegencyName: "Semua"
  },
  {
    id: "user-budi",
    username: "budi",
    password: "budi",
    name: "Budi Santoso",
    role: "officer",
    assignedProvinceId: "31",
    assignedProvinceName: "DKI JAKARTA",
    assignedRegencyId: "3174",
    assignedRegencyName: "KOTA JAKARTA SELATAN"
  },
  {
    id: "user-ani",
    username: "ani",
    password: "ani",
    name: "Ani Wijaya",
    role: "officer",
    assignedProvinceId: "36",
    assignedProvinceName: "BANTEN",
    assignedRegencyId: "3671",
    assignedRegencyName: "KOTA TANGERANG"
  }
];

// Ensure directories and files exist
const initializeFolders = async () => {
  try {
    await fs.mkdir(dbDir, { recursive: true });
    await fs.mkdir(uploadDir, { recursive: true });
    
    if (!existsSync(usersPath)) {
      await fs.writeFile(usersPath, JSON.stringify(defaultUsers, null, 2));
    }
  } catch (error) {
    console.error('Error creating initial folders:', error);
  }
};
await initializeFolders();

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `promo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Hanya diperbolehkan mengunggah file gambar (JPEG/JPG/PNG/WEBP)!'));
  }
});

// Helper to read database
const readDB = async () => {
  try {
    if (!existsSync(dbPath)) {
      await fs.writeFile(dbPath, JSON.stringify([], null, 2));
      return [];
    }
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file:', error);
    return [];
  }
};

// Helper to write database
const writeDB = async (data) => {
  try {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
};

// Helper to read users database
const readUsers = async () => {
  try {
    if (!existsSync(usersPath)) {
      await fs.writeFile(usersPath, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }
    const data = await fs.readFile(usersPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users database:', error);
    return [];
  }
};

// Helper to write users database
const writeUsers = async (data) => {
  try {
    await fs.writeFile(usersPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to users database:', error);
  }
};

// Allowed media types — anything else gets remapped to Banner
const ALLOWED_MEDIA_TYPES = ['Banner', 'Pamflet', 'Sticker'];

const normalizeMediaType = (type) =>
  ALLOWED_MEDIA_TYPES.includes(type) ? type : 'Banner';

// Normalize an existing DB record so all media type fields conform
const normalizeItem = (item) => ({
  ...item,
  mediaType: normalizeMediaType(item.mediaType),
  mediaType2: item.mediaType2 ? normalizeMediaType(item.mediaType2) : '',
  mediaItems: Array.isArray(item.mediaItems)
    ? item.mediaItems.map(m => ({ ...m, type: normalizeMediaType(m.type) }))
    : []
});

// --- API ENDPOINTS ---

// 1. Get all promo media entries (with region filtering)
app.get('/api/promo-media', async (req, res) => {
  const { regency } = req.query;
  let data = await readDB();

  // Normalize any legacy/invalid media types to Banner
  data = data.map(normalizeItem);

  // If user is a restricted officer, only show their regency
  if (regency && regency !== 'Semua' && regency !== 'All') {
    data = data.filter(item => item.regency && item.regency.toUpperCase() === regency.toUpperCase());
  }

  // Sort by newest first
  const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// 2. Add new promo media entry (multipart form with image upload)
app.post('/api/promo-media', upload.single('photo'), async (req, res) => {
  try {
    const {
      outletName,
      address,
      reporterName,
      mediaType,
      condition,
      installationDate,
      expiryDate,
      latitude,
      longitude,
      notes,
      province,
      regency,
      district,
      village,
      width,
      height,
      unit,
      quantity,
      hasSecondMedia,
      mediaType2,
      width2,
      height2,
      quantity2,
      mediaItems
    } = req.body;

    if (!outletName || !mediaType || !condition) {
      return res.status(400).json({ message: 'Nama outlet, tipe media, dan kondisi wajib diisi!' });
    }

    let photoUrl = '/uploads/placeholder-media.jpg'; // fallback
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const parsedWidth = width ? parseFloat(width) : null;
    const parsedHeight = height ? parseFloat(height) : null;
    const computedDimensions = parsedWidth && parsedHeight ? `${parsedWidth} x ${parsedHeight} ${unit || 'm'}` : '-';

    const parsedWidth2 = width2 ? parseFloat(width2) : null;
    const parsedHeight2 = height2 ? parseFloat(height2) : null;
    const computedDimensions2 = parsedWidth2 && parsedHeight2 ? `${parsedWidth2} x ${parsedHeight2} ${unit || 'm'}` : '-';

    // Parse full mediaItems array (unlimited types)
    let parsedMediaItems = [];
    try {
      parsedMediaItems = mediaItems ? JSON.parse(mediaItems) : [];
    } catch (_) {
      parsedMediaItems = [];
    }
    // Normalize all incoming media types
    parsedMediaItems = parsedMediaItems.map(m => ({ ...m, type: normalizeMediaType(m.type) }));

    const safeMediaType = normalizeMediaType(mediaType);
    const safeMediaType2 = mediaType2 ? normalizeMediaType(mediaType2) : '';
    const newPromo = {
      id: `promo-${uuidv4().substring(0, 8)}`,
      outletName,
      address: address || 'Tidak ada alamat',
      reporterName: reporterName || 'Anonim',
      mediaType: safeMediaType,
      width: parsedWidth,
      height: parsedHeight,
      unit: unit || 'm',
      dimensions: computedDimensions,
      quantity: quantity ? parseInt(quantity) : 1,
      hasSecondMedia: hasSecondMedia === 'true' || hasSecondMedia === true,
      mediaType2: safeMediaType2,
      width2: parsedWidth2,
      height2: parsedHeight2,
      quantity2: quantity2 ? parseInt(quantity2) : 0,
      dimensions2: computedDimensions2,
      mediaItems: parsedMediaItems,
      condition,
      installationDate: installationDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      province: province || '',
      regency: regency || '',
      district: district || '',
      village: village || '',
      photoUrl,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    const data = await readDB();
    data.push(newPromo);
    await writeDB(data);

    res.status(201).json({
      message: 'Pendataan media promo berhasil disimpan!',
      data: newPromo
    });
  } catch (error) {
    console.error('Error creating promo entry:', error);
    res.status(500).json({ message: 'Gagal menyimpan data: ' + error.message });
  }
});

// 3. Update promo media entry (e.g. update condition, expiry date, or notes)
app.put('/api/promo-media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const data = await readDB();
    const index = data.findIndex(item => item.id === id);

    if (index === -1) {
      return res.status(404).json({ message: 'Data media promo tidak ditemukan!' });
    }

    // List of allowed fields to update
    const allowedUpdates = [
      'outletName', 'address', 'reporterName', 'mediaType', 
      'dimensions', 'condition', 'installationDate', 'expiryDate', 
      'latitude', 'longitude', 'notes', 'province', 'regency', 'district', 'village',
      'width', 'height', 'unit',
      'quantity', 'hasSecondMedia', 'mediaType2', 'width2', 'height2', 'quantity2', 'dimensions2'
    ];

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'latitude' || key === 'longitude' || key === 'width' || key === 'height' || key === 'width2' || key === 'height2') {
          data[index][key] = updates[key] ? parseFloat(updates[key]) : null;
        } else if (key === 'quantity' || key === 'quantity2') {
          data[index][key] = updates[key] ? parseInt(updates[key]) : 0;
        } else if (key === 'hasSecondMedia') {
          data[index][key] = updates[key] === 'true' || updates[key] === true;
        } else {
          data[index][key] = updates[key];
        }
      }
    }

    // Recompute dimensions if width/height/unit changed
    if (updates.width !== undefined || updates.height !== undefined || updates.unit !== undefined) {
      const w = data[index].width;
      const h = data[index].height;
      const u = data[index].unit || 'm';
      data[index].dimensions = w && h ? `${w} x ${h} ${u}` : '-';
    }

    // Recompute dimensions2 if width2/height2/unit changed
    if (updates.width2 !== undefined || updates.height2 !== undefined || updates.unit !== undefined) {
      const w2 = data[index].width2;
      const h2 = data[index].height2;
      const u = data[index].unit || 'm';
      data[index].dimensions2 = w2 && h2 ? `${w2} x ${h2} ${u}` : '-';
    }

    await writeDB(data);
    res.json({
      message: 'Data media promo berhasil diperbarui!',
      data: data[index]
    });
  } catch (error) {
    console.error('Error updating promo entry:', error);
    res.status(500).json({ message: 'Gagal memperbarui data: ' + error.message });
  }
});

// 4. Delete promo media entry
app.delete('/api/promo-media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readDB();
    const filtered = data.filter(item => item.id !== id);

    if (data.length === filtered.length) {
      return res.status(404).json({ message: 'Data media promo tidak ditemukan!' });
    }

    // Try to delete physical file if it exists and is not a mock image
    const itemToDelete = data.find(item => item.id === id);
    if (itemToDelete && itemToDelete.photoUrl && !itemToDelete.photoUrl.includes('mock-')) {
      const filename = path.basename(itemToDelete.photoUrl);
      const filePath = path.join(uploadDir, filename);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn(`Could not delete physical file: ${filePath}`, err.message);
      }
    }

    await writeDB(filtered);
    res.json({ message: 'Data media promo berhasil dihapus!' });
  } catch (error) {
    console.error('Error deleting promo entry:', error);
    res.status(500).json({ message: 'Gagal menghapus data: ' + error.message });
  }
});

// 5. Get statistics (with region filtering)
app.get('/api/stats', async (req, res) => {
  const { regency } = req.query;
  let data = await readDB();

  // If user is restricted officer, only count their regency
  if (regency && regency !== 'Semua' && regency !== 'All') {
    data = data.filter(item => item.regency && item.regency.toUpperCase() === regency.toUpperCase());
  }

  const now = new Date();
  
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

    // Expiry check
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

  res.json(stats);
});

// 6. Get local network IP address
app.get('/api/network-ip', (req, res) => {
  res.json({ localIp });
});

// --- AUTHENTICATION & USER MANAGEMENT API ---

// Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readUsers();
    
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }
    
    // Return user info (exclude password in production, but here we can just send it)
    const { password: _, ...userInfo } = user;
    res.json(userInfo);
  } catch (error) {
    res.status(500).json({ message: 'Gagal melakukan login: ' + error.message });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const users = await readUsers();
    // Exclude passwords
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data user: ' + error.message });
  }
});

// Create new user (admin only)
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name, assignedProvinceId, assignedProvinceName, assignedRegencyId, assignedRegencyName } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ message: 'Username, password, dan nama wajib diisi!' });
    }

    const users = await readUsers();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (exists) {
      return res.status(400).json({ message: 'Username sudah terdaftar!' });
    }

    const newUser = {
      id: `user-${uuidv4().substring(0, 8)}`,
      username,
      password,
      name,
      role: 'officer',
      assignedProvinceId: assignedProvinceId || '',
      assignedProvinceName: assignedProvinceName || 'Semua',
      assignedRegencyId: assignedRegencyId || '',
      assignedRegencyName: assignedRegencyName || 'Semua'
    };

    users.push(newUser);
    await writeUsers(users);

    const { password: _, ...userInfo } = newUser;
    res.status(201).json({ message: 'Petugas baru berhasil didaftarkan!', data: userInfo });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat petugas: ' + error.message });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (id === 'user-admin') {
      return res.status(400).json({ message: 'Akun Administrator utama tidak boleh dihapus!' });
    }

    const users = await readUsers();
    const filtered = users.filter(u => u.id !== id);

    if (users.length === filtered.length) {
      return res.status(404).json({ message: 'User tidak ditemukan!' });
    }

    await writeUsers(filtered);
    res.json({ message: 'Petugas berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus petugas: ' + error.message });
  }
});

// Serve static uploaded photos
app.use('/uploads', express.static(uploadDir));

// Fallback for placeholder images if not found
app.get('/uploads/:filename', (req, res) => {
  // If the file actually exists, express.static would have served it.
  // We reach here only if file is missing (e.g. mock images before they are generated).
  // Return a stylish inline SVG placeholder!
  const { filename } = req.params;
  let text = 'Media Promo';
  let color = '#4f46e5'; // Indigo

  if (filename.includes('neonbox')) {
    text = 'Neon Box';
    color = '#ec4899'; // Pink
  } else if (filename.includes('xbanner')) {
    text = 'X-Banner';
    color = '#10b981'; // Emerald
  } else if (filename.includes('billboard')) {
    text = 'Billboard';
    color = '#3b82f6'; // Blue
  } else if (filename.includes('placeholder')) {
    text = 'No Photo';
    color = '#6b7280'; // Gray
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <rect width="400" height="300" fill="#1e1b4b"/>
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#0f0f1b" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)" rx="10"/>
    <circle cx="200" cy="120" r="45" fill="#ffffff" fill-opacity="0.1" />
    <path d="M180 120 L195 135 L220 110" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
    <text x="200" y="200" fill="#ffffff" font-family="system-ui, sans-serif" font-size="20" font-weight="bold" text-anchor="middle">${text}</text>
    <text x="200" y="230" fill="#9ca3af" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">Mock Photo Asset</text>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Serve frontend assets in production mode
const distPath = path.join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Function to fetch local IP address
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIp();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 SERVER ACTIVE RUNNING AT:`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Network: http://${localIp}:${PORT}`);
  console.log(`==================================================`);
  console.log(`📱 AKSES LEWAT PONSEL:`);
  console.log(`1. Pastikan Ponsel & Laptop terhubung ke Wi-Fi yang sama.`);
  console.log(`2. Buka browser ponsel dan ketik: http://${localIp}:${PORT}`);
  console.log(`==================================================\n`);
});
