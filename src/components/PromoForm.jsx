import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Upload, CheckCircle, RefreshCw, AlertTriangle, Store, Map, Compass, Layers, Calendar, FileText, Check, X } from 'lucide-react';
import { gps } from '../utils/gps';
import { imageService } from '../services/imageService';
import { api } from '../services/api';
import { dbService } from '../services/dbService';
import { useApp } from '../store/AppContext';
import { validatePromo } from '../validators';
import { MEDIA_TYPES, CONDITIONS } from '../constants';

export default function PromoForm({ onSaveSuccess, currentUser }) {
  const { isOnline, addToast, updateQueueCount } = useApp();
  const [formData, setFormData] = useState({
    outletName: '',
    address: '',
    reporterName: '',
    mediaType: 'Banner',
    width: '',
    height: '',
    unit: 'cm',
    quantity: 1,
    hasSecondMedia: false,
    mediaType2: 'Banner',
    width2: '',
    height2: '',
    quantity2: 0,
    condition: 'Good',
    installationDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    latitude: '',
    longitude: '',
    notes: '',
    province: '',
    regency: '',
    district: '',
    village: ''
  });

  const [mediaSelections, setMediaSelections] = useState(
    Object.fromEntries(MEDIA_TYPES.map(t => [t, { active: false, width: '', height: '', quantity: 1 }]))
  );

  const handleMediaToggle = (type) => {
    setMediaSelections(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        active: !prev[type].active
      }
    }));
  };

  const handleMediaValChange = (type, field, val) => {
    setMediaSelections(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: val
      }
    }));
  };

  // State lists loaded from API
  const [provincesList, setProvincesList] = useState([]);
  const [regenciesList, setRegenciesList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [villagesList, setVillagesList] = useState([]);
  // Mode input teks manual saat offline & tidak ada cache
  const [geoOfflineMode, setGeoOfflineMode] = useState({ district: false, village: false });

  // Selected API IDs to fetch children
  const [selectedIds, setSelectedIds] = useState({
    provinceId: '',
    regencyId: '',
    districtId: ''
  });

  // Loading states
  const [loadingGeo, setLoadingGeo] = useState({
    provinces: false,
    regencies: false,
    districts: false,
    villages: false
  });

  // Fetch all regencies for admin on mount/change
  useEffect(() => {
    if (currentUser && currentUser.role !== 'officer') {
      const fetchAllRegencies = async () => {
        try {
          setLoadingGeo(prev => ({ ...prev, regencies: true }));
          const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
          if (!res.ok) throw new Error('Gagal memuat data provinsi');
          const provinces = await res.json();

          const regencyPromises = provinces.map(async (prov) => {
            try {
              const regRes = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${prov.id}.json`);
              if (regRes.ok) {
                const regs = await regRes.json();
                return regs.map(r => ({
                  id: r.id,
                  name: r.name,
                  provinceId: prov.id,
                  provinceName: prov.name
                }));
              }
            } catch (e) {
              console.error(e);
            }
            return [];
          });

          const results = await Promise.all(regencyPromises);
          const combined = results.flat().sort((a, b) => a.name.localeCompare(b.name));
          setRegenciesList(combined);
        } catch (err) {
          console.error('Gagal memuat semua wilayah:', err);
          addToast('Gagal memuat daftar wilayah.', 'error');
        } finally {
          setLoadingGeo(prev => ({ ...prev, regencies: false }));
        }
      };
      fetchAllRegencies();
    }
  }, [currentUser]);

  // Handle auto-prefill & lock for officer
  useEffect(() => {
    if (currentUser && currentUser.role === 'officer') {
      const regIds = (currentUser.assignedRegencyId || '').split(',').filter(Boolean);
      const regNames = (currentUser.assignedRegencyName || '').split(',').filter(Boolean);
      const provIds = (currentUser.assignedProvinceId || '').split(',').filter(Boolean);
      const provNames = (currentUser.assignedProvinceName || '').split(',').filter(Boolean);

      if (regIds.length <= 1) {
        // Old behavior: single regency lock
        setFormData(prev => ({
          ...prev,
          province: currentUser.assignedProvinceName || '',
          regency: (currentUser.assignedRegencyName || '').replace(/^KABUPATEN\b/gi, 'KAB.'),
          reporterName: currentUser.name || '',
          district: '',
          village: ''
        }));
        setSelectedIds({
          provinceId: currentUser.assignedProvinceId || '',
          regencyId: currentUser.assignedRegencyId || '',
          districtId: ''
        });
        setRegenciesList([]);
        setDistrictsList([]);
        setVillagesList([]);

        if (currentUser.assignedRegencyId) {
          const fetchDistricts = async () => {
            setLoadingGeo(prev => ({ ...prev, districts: true }));
            const cacheKey = `districts_${currentUser.assignedRegencyId}`;
            try {
              const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${currentUser.assignedRegencyId}.json`);
              if (res.ok) {
                const data = await res.json();
                const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
                setDistrictsList(sorted);
                setGeoOfflineMode(prev => ({ ...prev, district: false }));
                dbService.cacheGeoData(cacheKey, sorted).catch(() => {});
              }
            } catch (err) {
              console.warn('Fetch kecamatan gagal, coba dari cache...', err);
              try {
                const cached = await dbService.getCachedGeoData(cacheKey);
                if (cached && cached.length > 0) {
                  setDistrictsList(cached);
                  setGeoOfflineMode(prev => ({ ...prev, district: false }));
                  addToast('Kecamatan dimuat dari cache offline.', 'warning');
                } else {
                  setDistrictsList([]);
                  setGeoOfflineMode(prev => ({ ...prev, district: true }));
                  addToast('Offline: Ketik nama kecamatan secara manual.', 'warning');
                }
              } catch (dbErr) {
                setDistrictsList([]);
                setGeoOfflineMode(prev => ({ ...prev, district: true }));
              }
            } finally {
              setLoadingGeo(prev => ({ ...prev, districts: false }));
            }
          };
          fetchDistricts();
        }
      } else {
        // New behavior: multiple regencies selection
        const mappedRegencies = regIds.map((id, idx) => ({
          id,
          name: regNames[idx] || '',
          provinceId: provIds[idx] || provIds[0] || '',
          provinceName: provNames[idx] || provNames[0] || ''
        }));

        setFormData(prev => ({
          ...prev,
          province: '',
          regency: '',
          reporterName: currentUser.name || '',
          district: '',
          village: ''
        }));
        setSelectedIds({
          provinceId: '',
          regencyId: '',
          districtId: ''
        });
        setRegenciesList(mappedRegencies);
        setDistrictsList([]);
        setVillagesList([]);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        reporterName: currentUser ? currentUser.name : prev.reporterName
      }));
    }
  }, [currentUser]);

  const handleProvinceChange = async (e) => {
    const provId = e.target.value;
    const provName = provincesList.find(p => p.id === provId)?.name || '';
    
    setFormData(prev => ({
      ...prev,
      province: provName,
      regency: '',
      district: '',
      village: ''
    }));
    setSelectedIds({
      provinceId: provId,
      regencyId: '',
      districtId: ''
    });
    setRegenciesList([]);
    setDistrictsList([]);
    setVillagesList([]);

    if (!provId) return;

    try {
      setLoadingGeo(prev => ({ ...prev, regencies: true }));
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
      if (res.ok) {
        const data = await res.json();
        setRegenciesList(data.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err) {
      console.error('Gagal memuat kabupaten/kota:', err);
    } finally {
      setLoadingGeo(prev => ({ ...prev, regencies: false }));
    }
  };

  const handleRegencyChange = async (e) => {
    const regId = e.target.value;
    const regObj = regenciesList.find(r => r.id === regId);
    const regName = regObj?.name || '';
    const formattedRegName = regName.replace(/^KABUPATEN\b/gi, 'KAB.');
    
    const associatedProvId = regObj?.provinceId || selectedIds.provinceId;
    const associatedProvName = regObj?.provinceName || formData.province;
    
    setFormData(prev => ({
      ...prev,
      province: associatedProvName,
      regency: formattedRegName,
      district: '',
      village: ''
    }));
    setSelectedIds(prev => ({
      ...prev,
      provinceId: associatedProvId,
      regencyId: regId,
      districtId: ''
    }));
    setDistrictsList([]);
    setVillagesList([]);

    if (!regId) return;

    setLoadingGeo(prev => ({ ...prev, districts: true }));
    const cacheKey = `districts_${regId}`;
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`);
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setDistrictsList(sorted);
        setGeoOfflineMode(prev => ({ ...prev, district: false }));
        dbService.cacheGeoData(cacheKey, sorted).catch(() => {});
      }
    } catch (err) {
      console.warn('Fetch kecamatan gagal, coba dari cache...', err);
      try {
        const cached = await dbService.getCachedGeoData(cacheKey);
        if (cached && cached.length > 0) {
          setDistrictsList(cached);
          setGeoOfflineMode(prev => ({ ...prev, district: false }));
          addToast('Kecamatan dimuat dari cache offline.', 'warning');
        } else {
          setDistrictsList([]);
          setGeoOfflineMode(prev => ({ ...prev, district: true }));
          addToast('Offline: Ketik nama kecamatan secara manual.', 'warning');
        }
      } catch (dbErr) {
        setDistrictsList([]);
        setGeoOfflineMode(prev => ({ ...prev, district: true }));
      }
    } finally {
      setLoadingGeo(prev => ({ ...prev, districts: false }));
    }
  };

  const handleDistrictChange = async (e) => {
    const distId = e.target.value;
    const distName = districtsList.find(d => d.id === distId)?.name || '';
    
    setFormData(prev => ({
      ...prev,
      district: distName,
      village: ''
    }));
    setSelectedIds(prev => ({
      ...prev,
      districtId: distId
    }));
    setVillagesList([]);

    if (!distId) return;

    setLoadingGeo(prev => ({ ...prev, villages: true }));
    const cacheKey = `villages_${distId}`;
    try {
      const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${distId}.json`);
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setVillagesList(sorted);
        setGeoOfflineMode(prev => ({ ...prev, village: false }));
        dbService.cacheGeoData(cacheKey, sorted).catch(() => {});
      }
    } catch (err) {
      console.warn('Fetch desa gagal, coba dari cache...', err);
      try {
        const cached = await dbService.getCachedGeoData(cacheKey);
        if (cached && cached.length > 0) {
          setVillagesList(cached);
          setGeoOfflineMode(prev => ({ ...prev, village: false }));
          addToast('Desa/kelurahan dimuat dari cache offline.', 'warning');
        } else {
          setVillagesList([]);
          setGeoOfflineMode(prev => ({ ...prev, village: true }));
          addToast('Offline: Ketik nama desa/kelurahan secara manual.', 'warning');
        }
      } catch (dbErr) {
        setVillagesList([]);
        setGeoOfflineMode(prev => ({ ...prev, village: true }));
      }
    } finally {
      setLoadingGeo(prev => ({ ...prev, villages: false }));
    }
  };

  const handleVillageChange = (e) => {
    const villageName = e.target.value;
    setFormData(prev => ({
      ...prev,
      village: villageName
    }));
  };
  
  const [showMapPicker, setShowMapPicker] = useState(false);
  const mapPickerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [tempCoords, setTempCoords] = useState({ lat: -6.2297, lng: 106.8296 });

  const openMapPicker = async () => {
    setShowMapPicker(true);
    setGpsStatus('loading');
    setGpsErrorMsg('');
    
    let currentLat = parseFloat(formData.latitude);
    let currentLng = parseFloat(formData.longitude);
    
    if (!isNaN(currentLat) && !isNaN(currentLng) && currentLat !== 0 && currentLng !== 0) {
      setTempCoords({ lat: currentLat, lng: currentLng });
      setGpsStatus('success');
    } else {
      try {
        const coords = await gps.getCurrentLocation();
        setTempCoords({ lat: coords.latitude, lng: coords.longitude });
        setGpsStatus('success');
        setFormData(prev => ({
          ...prev,
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6)
        }));
      } catch (err) {
        console.error('Map Picker GPS Error:', err);
        setGpsStatus('error');
        setGpsErrorMsg(err.message || 'GPS lemah, silakan geser pin pada peta untuk menentukan lokasi.');
        setTempCoords({ lat: -6.2297, lng: 106.8296 });
      }
    }
  };

  const handleSaveCoords = () => {
    setFormData(prev => ({
      ...prev,
      latitude: tempCoords.lat.toFixed(6),
      longitude: tempCoords.lng.toFixed(6)
    }));
    setShowMapPicker(false);
  };

  const fetchDeviceLocationInPicker = async () => {
    setGpsStatus('loading');
    setGpsErrorMsg('');
    try {
      const coords = await gps.getCurrentLocation();
      setTempCoords({ lat: coords.latitude, lng: coords.longitude });
      setGpsStatus('success');
      
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([coords.latitude, coords.longitude], 16);
        markerRef.current.setLatLng([coords.latitude, coords.longitude]);
      }
    } catch (err) {
      console.error('Fetch GPS inside picker error:', err);
      setGpsStatus('error');
      setGpsErrorMsg(err.message || 'Gagal mendapatkan GPS perangkat. Pastikan GPS HP aktif & beri izin lokasi.');
    }
  };

  useEffect(() => {
    if (showMapPicker && mapPickerRef.current && window.L) {
      const L = window.L;
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      
      const map = L.map(mapPickerRef.current, {
        center: [tempCoords.lat, tempCoords.lng],
        zoom: 15,
        zoomControl: true
      });
      
      mapInstanceRef.current = map;
      
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
      }).addTo(map);
      
      const blueIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          background: #2563eb;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        "><div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });

      const marker = L.marker([tempCoords.lat, tempCoords.lng], {
        icon: blueIcon,
        draggable: true
      }).addTo(map);
      
      markerRef.current = marker;
      
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setTempCoords({ lat: position.lat, lng: position.lng });
      });
      
      map.on('click', (e) => {
        const position = e.latlng;
        marker.setLatLng(position);
        setTempCoords({ lat: position.lat, lng: position.lng });
      });
      
      setTimeout(() => {
        map.invalidateSize();
      }, 300);
    }
    
    return () => {
      if (!showMapPicker && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMapPicker]);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, loading, success, error
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);   // nilai meter akurasi GPS
  const [gpsAttempt, setGpsAttempt] = useState(0);        // percobaan ke-berapa (1-3)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get current GPS coordinates — pakai getBestLocation (retry 3x, pilih akurasi terbaik)
  const getGPSLocation = async () => {
    setGpsStatus('loading');
    setGpsErrorMsg('');
    setGpsAccuracy(null);
    setGpsAttempt(0);

    try {
      const coords = await gps.getBestLocation(
        (attempt, accuracy) => {
          setGpsAttempt(attempt);
          setGpsAccuracy(accuracy);
        },
        3,   // maxAttempts
        30   // targetAccuracy: berhenti jika sudah <= 30 meter
      );
      setFormData(prev => ({
        ...prev,
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6),
        gpsAccuracy: coords.accuracy ? Math.round(coords.accuracy) : null
      }));
      setGpsAccuracy(coords.accuracy);
      setGpsStatus('success');
      setGpsErrorMsg('');
    } catch (error) {
      console.error('GPS Geolocation Error:', error);
      setGpsStatus('error');
      setGpsErrorMsg(error.message);
      setGpsAccuracy(null);
      setFormData(prev => ({
        ...prev,
        latitude: '',
        longitude: '',
        gpsAccuracy: null
      }));
    }
  };

  // Auto get location on mount
  useEffect(() => {
    getGPSLocation();
  }, []);

  // Handle Photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal adalah 10MB!');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (e) => {
    e.preventDefault();
    setPhoto(null);
    setPhotoPreview('');
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const activeMediaTypes = MEDIA_TYPES.filter(key => mediaSelections[key]?.active);
    const validationError = validatePromo(formData, activeMediaTypes);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    setUploadPercent(0);

    // Compress photo client-side in the background
    let finalPhoto = photo;
    if (photo) {
      try {
        finalPhoto = await imageService.compressPhoto(photo);
      } catch (err) {
        console.warn('Canvas compression failed, sending raw file:', err);
      }
    }

    // Structure the data to send
    const cleanPayload = {
      ...formData,
      installationTime: new Date().toLocaleTimeString('id-ID', { hour12: false }), // Mencatat jam saat ini secara otomatis (format HH:mm:ss)
      mediaType: activeMediaTypes[0],
      width: mediaSelections[activeMediaTypes[0]].width || '',
      height: mediaSelections[activeMediaTypes[0]].height || '',
      quantity: mediaSelections[activeMediaTypes[0]].quantity || 1,
    };

    if (activeMediaTypes.length > 1) {
      const type2 = activeMediaTypes[1];
      cleanPayload.hasSecondMedia = true;
      cleanPayload.mediaType2 = type2;
      cleanPayload.width2 = mediaSelections[type2].width || '';
      cleanPayload.height2 = mediaSelections[type2].height || '';
      cleanPayload.quantity2 = mediaSelections[type2].quantity || 1;
    } else {
      cleanPayload.hasSecondMedia = false;
      cleanPayload.mediaType2 = '';
      cleanPayload.width2 = '';
      cleanPayload.height2 = '';
      cleanPayload.quantity2 = 0;
    }

    // Prepare full media items as JSON
    const mediaItems = activeMediaTypes.map(t => ({
      type: t,
      quantity: mediaSelections[t].quantity || 1,
      width: mediaSelections[t].width || '',
      height: mediaSelections[t].height || ''
    }));
    cleanPayload.mediaItems = mediaItems;

    // Handle OFFLINE submission
    if (!isOnline) {
      try {
        // Save to IndexedDB
        const offlineRecord = {
          ...cleanPayload,
          photo: finalPhoto, // Native File/Blob fits perfectly
          photoUrl: photoPreview || '/uploads/placeholder-media.jpg' // Local visual preview
        };
        await dbService.addToQueue(offlineRecord);
        await updateQueueCount();
        
        setSubmitStatus('success');
        addToast('Offline: Pendataan disimpan secara lokal & akan disinkronkan saat online!', 'warning');
        
        setTimeout(() => {
          if (onSaveSuccess) onSaveSuccess();
          setSubmitStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('Offline storage error:', err);
        setErrorMsg('Gagal menyimpan data secara lokal: ' + err.message);
        setSubmitStatus('error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle ONLINE submission
    const submissionData = new FormData();
    Object.keys(cleanPayload).forEach(key => {
      if (key === 'mediaItems') {
        submissionData.append(key, JSON.stringify(cleanPayload[key]));
      } else {
        submissionData.append(key, cleanPayload[key]);
      }
    });

    if (finalPhoto) {
      submissionData.append('photo', finalPhoto);
    }

    try {
      await imageService.uploadWithProgress(submissionData, (percent) => {
        setUploadPercent(percent);
      });

      setSubmitStatus('success');
      addToast('Pendataan media promo berhasil disimpan ke server!', 'success');
      
      setTimeout(() => {
        if (onSaveSuccess) onSaveSuccess();
        setSubmitStatus('idle');
      }, 1500);
    } catch (err) {
      console.error('Online Submit Error:', err);
      // Fallback: save to IndexedDB offline queue automatically!
      try {
        addToast('Koneksi gagal. Menyimpan ke antrean sinkronisasi lokal...', 'warning');
        const offlineRecord = {
          ...cleanPayload,
          photo: finalPhoto,
          photoUrl: photoPreview || '/uploads/placeholder-media.jpg'
        };
        await dbService.addToQueue(offlineRecord);
        await updateQueueCount();
        
        setSubmitStatus('success');
        setTimeout(() => {
          if (onSaveSuccess) onSaveSuccess();
          setSubmitStatus('idle');
        }, 2000);
      } catch (dbErr) {
        setErrorMsg('Gagal terhubung ke server dan gagal menyimpan offline: ' + dbErr.message);
        setSubmitStatus('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <CheckCircle size={64} color="var(--color-success)" style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.4))' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', color: 'white', marginBottom: '0.75rem' }}>Data Berhasil Disimpan!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Pendataan media promo telah ditambahkan ke sistem.</p>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
      <h2 className="card-title" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <Camera size={20} color="var(--color-primary)" /> Input Data Media Promo
      </h2>
      
      {errorMsg && (
        <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: 'var(--color-danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-grid">
        {/* Left Column: Identitas & Lokasi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Card 1: Identitas Outlet */}
          <div className="android-card">
            <span className="android-section-title">
              <Store size={18} color="var(--color-primary)" /> Identitas Outlet
            </span>
            
            <div className="android-field">
              <div className="android-field-icon"><Store size={20} /></div>
              <div className="android-field-content">
                <label className="android-label">Nama Outlet *</label>
                <input 
                  type="text" 
                  name="outletName" 
                  value={formData.outletName} 
                  onChange={handleChange}
                  placeholder="Contoh: Toko Sehat Tentrem" 
                  className="android-input"
                  required 
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="android-field">
              <div className="android-field-icon"><FileText size={20} /></div>
              <div className="android-field-content">
                <label className="android-label">Alamat Outlet</label>
                <textarea 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange}
                  placeholder="Jl. Kemang Raya No. 10..." 
                  className="android-input"
                  style={{ resize: 'none', minHeight: '44px' }}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Wilayah & GPS */}
          <div className="android-card">
            <span className="android-section-title">
              <Compass size={18} color="var(--color-primary)" /> Wilayah & Lokasi GPS
            </span>

            <div className="android-field">
              <div className="android-field-icon"><Map size={20} /></div>
              <div className="android-field-content">
                <label className="android-label">Kabupaten / Kota</label>
                <select 
                  name="regency" 
                  value={(() => {
                    const isOfficer = currentUser?.role === 'officer';
                    const regIds = (currentUser?.assignedRegencyId || '').split(',').filter(Boolean);
                    const isLockedOfficer = isOfficer && regIds.length <= 1;
                    return isLockedOfficer ? currentUser.assignedRegencyId : selectedIds.regencyId;
                  })()} 
                  onChange={handleRegencyChange} 
                  className="android-input"
                  disabled={(() => {
                    const isOfficer = currentUser?.role === 'officer';
                    const regIds = (currentUser?.assignedRegencyId || '').split(',').filter(Boolean);
                    const isLockedOfficer = isOfficer && regIds.length <= 1;
                    if (isLockedOfficer) return true;
                    return loadingGeo.regencies;
                  })()}
                >
                  {(() => {
                    const isOfficer = currentUser?.role === 'officer';
                    const regIds = (currentUser?.assignedRegencyId || '').split(',').filter(Boolean);
                    const isLockedOfficer = isOfficer && regIds.length <= 1;

                    if (isLockedOfficer) {
                      return (
                        <option value={currentUser.assignedRegencyId}>
                          {currentUser.assignedRegencyName.replace(/^KABUPATEN\b/gi, 'KAB.')}
                        </option>
                      );
                    } else {
                      return (
                        <>
                          <option value="">{loadingGeo.regencies ? 'Memuat...' : '-- Pilih Kabupaten / Kota --'}</option>
                          {regenciesList.map(reg => {
                            const formattedName = reg.name.replace(/^KABUPATEN\b/gi, 'KAB.');
                            const label = reg.provinceName ? `${formattedName} (${reg.provinceName})` : formattedName;
                            return (
                              <option key={reg.id} value={reg.id}>
                                {label}
                              </option>
                            );
                          })}
                        </>
                      );
                    }
                  })()}
                </select>
              </div>
            </div>

            <div className="android-field">
              <div className="android-field-icon"><MapPin size={20} /></div>
              <div className="android-field-content">
                <label className="android-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Kecamatan
                  {geoOfflineMode.district && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(234,179,8,0.15)', color: '#ca8a04', padding: '1px 6px', borderRadius: '8px', fontWeight: '600' }}>⚡ Offline - Manual</span>
                  )}
                </label>
                {geoOfflineMode.district ? (
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="Ketik nama kecamatan..."
                    className="android-input"
                    style={{ borderBottom: '2px solid #ca8a04' }}
                  />
                ) : (
                  <select
                    name="district"
                    value={selectedIds.districtId}
                    onChange={handleDistrictChange}
                    className="android-input"
                    disabled={!selectedIds.regencyId || loadingGeo.districts}
                  >
                    <option value="">{loadingGeo.districts ? 'Memuat...' : '-- Pilih Kecamatan --'}</option>
                    {districtsList.map(dist => (
                      <option key={dist.id} value={dist.id}>{dist.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="android-field">
              <div className="android-field-icon"><MapPin size={20} /></div>
              <div className="android-field-content">
                <label className="android-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Kelurahan / Desa
                  {geoOfflineMode.village && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(234,179,8,0.15)', color: '#ca8a04', padding: '1px 6px', borderRadius: '8px', fontWeight: '600' }}>⚡ Offline - Manual</span>
                  )}
                </label>
                {geoOfflineMode.village ? (
                  <input
                    type="text"
                    name="village"
                    value={formData.village}
                    onChange={handleChange}
                    placeholder="Ketik nama desa/kelurahan..."
                    className="android-input"
                    style={{ borderBottom: '2px solid #ca8a04' }}
                  />
                ) : (
                  <select
                    name="village"
                    value={formData.village}
                    onChange={handleVillageChange}
                    className="android-input"
                    disabled={!selectedIds.districtId || loadingGeo.villages}
                  >
                    <option value="">{loadingGeo.villages ? 'Memuat...' : '-- Pilih Kelurahan --'}</option>
                    {villagesList.map(vil => (
                      <option key={vil.name} value={vil.name}>{vil.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* GPS Coordinates */}
            <div className="android-field">
              <div className="android-field-icon"><Compass size={20} /></div>
              <div className="android-field-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label className="android-label" style={{ margin: 0 }}>Koordinat GPS *</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      type="button" 
                      onClick={getGPSLocation} 
                      className="btn btn-secondary" 
                      style={{ padding: '2px 6px', fontSize: '0.7rem', gap: '3px', borderRadius: '6px' }}
                      disabled={gpsStatus === 'loading'}
                    >
                      {gpsStatus === 'loading' ? <RefreshCw className="pulse-green" size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Compass size={10} />} Lacak Otomatis
                    </button>
                    <button 
                      type="button" 
                      onClick={openMapPicker} 
                      className="btn btn-secondary" 
                      style={{ padding: '2px 6px', fontSize: '0.7rem', gap: '3px', borderRadius: '6px' }}
                    >
                      <Map size={10} /> Pilih di Peta
                    </button>
                  </div>
                </div>
                
                <div className="gps-wrapper" style={{ marginTop: '4px' }}>
                  <input 
                    type="text" 
                    name="latitude" 
                    value={formData.latitude} 
                    onChange={handleChange}
                    placeholder="Latitude (Contoh: -6.2297)" 
                    className="android-input" 
                    style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.06)', padding: '4px 0' }}
                  />
                  <input 
                    type="text" 
                    name="longitude" 
                    value={formData.longitude} 
                    onChange={handleChange}
                    placeholder="Longitude (Contoh: 106.8296)" 
                    className="android-input"
                    style={{ padding: '4px 0' }}
                  />
                </div>
                
                {gpsStatus === 'loading' && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-info)', marginTop: '4px', display: 'block' }}>
                    ⏳ Mencari lokasi terbaik... (Percobaan {gpsAttempt}/3
                    {gpsAccuracy ? ` — saat ini ±${Math.round(gpsAccuracy)}m` : ''})
                  </span>
                )}
                {gpsStatus === 'success' && (() => {
                  const accInfo = gps.getAccuracyLabel(gpsAccuracy);
                  return (
                    <span style={{ fontSize: '0.7rem', color: accInfo.color, marginTop: '4px', display: 'block', fontWeight: '600' }}>
                      {accInfo.emoji} {accInfo.label}
                      <span style={{ fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        ({formData.latitude}, {formData.longitude})
                      </span>
                    </span>
                  );
                })()}
                {gpsStatus === 'error' && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>⚠️ {gpsErrorMsg}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Media Detail & Foto */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Card 3: Tipe & Kuantitas Media Promo */}
          <div className="android-card">
            <span className="android-section-title">
              <Layers size={18} color="var(--color-primary)" /> Tipe & Kuantitas Media Promo
            </span>

            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {MEDIA_TYPES.map(type => {
                const sel = mediaSelections[type];
                return (
                  <div 
                    key={type} 
                    className={`media-row ${sel.active ? 'active' : ''}`} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      padding: '0.75rem 1rem',
                      background: sel.active ? 'rgba(37, 99, 235, 0.03)' : 'rgba(15, 23, 42, 0.02)',
                      border: '1.5px solid ' + (sel.active ? 'var(--color-primary)' : 'var(--border-color)'),
                      borderRadius: '12px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleMediaToggle(type)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: '2px solid ' + (sel.active ? 'var(--color-primary)' : 'var(--text-muted)'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: sel.active ? 'var(--color-primary)' : 'transparent',
                          color: 'white',
                          transition: 'all 0.2s ease'
                        }}>
                          {sel.active && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span style={{ fontWeight: '600', color: sel.active ? 'var(--text-main)' : 'var(--text-muted)' }}>{type}</span>
                      </div>
                      {!sel.active && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Belum terpilih</span>}
                    </div>

                    {sel.active && (
                      <div 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          gap: '0.75rem', 
                          paddingTop: '0.65rem', 
                          borderTop: '1px dashed var(--border-color)',
                          animation: 'fadeIn 0.25s ease' 
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Jumlah Unit:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '0.15rem 0.65rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleMediaValChange(type, 'quantity', Math.max(1, parseInt(sel.quantity || 1) - 1))}
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              className="android-input" 
                              style={{ textAlign: 'center', width: '45px', padding: '0.15rem', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--bg-surface-solid)', color: 'var(--text-main)' }}
                              value={sel.quantity}
                              onChange={(e) => handleMediaValChange(type, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              min="1"
                              required
                            />
                            <button 
                              type="button" 
                              className="btn btn-secondary" 
                              style={{ padding: '0.15rem 0.65rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => handleMediaValChange(type, 'quantity', parseInt(sel.quantity || 1) + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="android-field" style={{ marginTop: '0.5rem' }}>
              <div className="android-field-icon"><Calendar size={20} /></div>
              <div className="android-field-content">
                <label className="android-label">Tanggal Pemasangan</label>
                <input 
                  type="date" 
                  name="installationDate" 
                  value={formData.installationDate} 
                  onChange={handleChange}
                  className="android-input" 
                  style={{ marginTop: '4px', backgroundColor: 'rgba(15, 23, 42, 0.05)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                  readOnly
                  title="Tanggal otomatis diisi hari ini"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Dokumen & Foto */}
          <div className="android-card">
            <span className="android-section-title">
              <Camera size={18} color="var(--color-primary)" /> Dokumentasi & Catatan
            </span>

            {/* Upload Foto */}
            <div className="android-field" style={{ display: 'block' }}>
              <div style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.5rem' }}>
                <div className="android-field-icon" style={{ paddingTop: '2px' }}><Camera size={20} /></div>
                <label className="android-label" style={{ paddingTop: '4px' }}>Foto Media Promo</label>
              </div>

              {!photoPreview ? (
                <div className="upload-container" style={{ margin: '0.25rem 0 0' }}>
                  <Upload className="upload-icon" />
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>Ambil Foto Kamera HP</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gunakan mode landscape / miring untuk mengambil foto</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={handlePhotoChange} 
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <img src={photoPreview} alt="Preview" className="upload-preview" style={{ maxHeight: '140px', borderRadius: '8px' }} />
                  <button 
                    type="button" 
                    onClick={removePhoto} 
                    className="btn btn-danger-outline"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', width: 'fit-content', alignSelf: 'center', borderRadius: '6px' }}
                  >
                    Ganti Foto
                  </button>
                </div>
              )}
            </div>

            <div className="android-field">
              <div className="android-field-icon"><FileText size={20} /></div>
              <div className="android-field-content">
                <label className="android-label">Catatan Tambahan</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleChange}
                  placeholder="Contoh: Posisi menghadap jalan, warna pudar..." 
                  className="android-input"
                  style={{ resize: 'none', minHeight: '44px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Action wrapper */}
        <div className="form-submit-wrapper" style={{ gridColumn: '1 / -1' }}>
          {isSubmitting && uploadPercent > 0 && uploadPercent < 100 && (
            <div style={{ width: '100%', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span>Mengunggah Foto...</span>
                <span>{uploadPercent}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(15,23,42,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadPercent}%`, background: 'var(--color-primary)', transition: 'width 0.1s ease' }} />
              </div>
            </div>
          )}
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmitting}
            style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.85rem' }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="pulse-green" size={18} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle size={18} /> Simpan Pendataan
              </>
            )}
          </button>
        </div>
      </form>
    </div>

    {/* Map Picker Modal */}
    {showMapPicker && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={18} color="var(--color-primary)" /> Geser Pin untuk Tentukan Lokasi
              </h3>
              <button 
                type="button" 
                className="modal-close" 
                onClick={() => setShowMapPicker(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1rem' }}>
              {!window.L ? (
                <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem' }}>Peta Offline / CDN Mengalami Gangguan</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      Peta interaktif tidak dapat dimuat offline saat pertama kali dibuka. Silakan masukkan koordinat secara manual atau klik tombol lacak posisi asli HP.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>Latitude</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        placeholder="Contoh: -6.2297" 
                        value={tempCoords.lat}
                        onChange={(e) => setTempCoords(prev => ({ ...prev, lat: parseFloat(e.target.value) || '' }))}
                        className="android-input"
                        style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', background: 'var(--bg-surface-solid)', color: 'var(--text-main)', width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>Longitude</label>
                      <input 
                        type="number" 
                        step="0.000001"
                        placeholder="Contoh: 106.8296" 
                        value={tempCoords.lng}
                        onChange={(e) => setTempCoords(prev => ({ ...prev, lng: parseFloat(e.target.value) || '' }))}
                        className="android-input"
                        style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', background: 'var(--bg-surface-solid)', color: 'var(--text-main)', width: '100%', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  ref={mapPickerRef} 
                  style={{ 
                    height: '320px', 
                    width: '100%', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                  }}
                />
              )}
              
              <div style={{ marginTop: '1rem', background: 'rgba(37, 99, 235, 0.05)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                <div>📍 <strong>Latitude:</strong> {typeof tempCoords.lat === 'number' ? tempCoords.lat.toFixed(6) : tempCoords.lat || '0.000000'}</div>
                <div style={{ marginTop: '2px' }}>📍 <strong>Longitude:</strong> {typeof tempCoords.lng === 'number' ? tempCoords.lng.toFixed(6) : tempCoords.lng || '0.000000'}</div>

              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={fetchDeviceLocationInPicker}
                  disabled={gpsStatus === 'loading'}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {gpsStatus === 'loading' ? <RefreshCw className="pulse-green" size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Compass size={12} />} Arahkan Posisi
                </button>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowMapPicker(false)}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Batal
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSaveCoords}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    Simpan Lokasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
