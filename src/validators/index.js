export const validatePromo = (formData, activeMediaTypes) => {
  if (!formData.outletName || !formData.outletName.trim()) {
    return 'Nama outlet wajib diisi!';
  }
  if (!activeMediaTypes || activeMediaTypes.length === 0) {
    return 'Pilih minimal 1 tipe media promo yang dipasang!';
  }
  if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
    return 'Latitude tidak valid!';
  }
  if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
    return 'Longitude tidak valid!';
  }
  return null;
};

export const validateUser = (userData) => {
  if (!userData.username || !userData.username.trim()) {
    return 'Username wajib diisi!';
  }
  if (!userData.password || !userData.password.trim()) {
    return 'Password wajib diisi!';
  }
  if (!userData.name || !userData.name.trim()) {
    return 'Nama lengkap wajib diisi!';
  }
  return null;
};
