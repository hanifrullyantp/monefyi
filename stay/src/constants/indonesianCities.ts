/** Kota populer untuk autocomplete registrasi */
export const INDONESIAN_CITIES = [
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Makassar',
  'Palembang', 'Tangerang', 'Depok', 'Bekasi', 'Bogor', 'Yogyakarta',
  'Malang', 'Denpasar', 'Batam', 'Pekanbaru', 'Padang', 'Bandar Lampung',
  'Solo', 'Manado', 'Balikpapan', 'Pontianak', 'Samarinda', 'Cirebon',
  'Banjarmasin', 'Jambi', 'Mataram', 'Kupang', 'Ambon', 'Jayapura',
  'Lombok', 'Bali', 'Ubud', 'Sanur', 'Nusa Dua', 'Lainnya',
] as const;

export const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'guest_house', label: 'Guest House' },
  { value: 'villa', label: 'Villa' },
  { value: 'homestay', label: 'Homestay' },
  { value: 'kost', label: 'Kost' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'other', label: 'Lainnya' },
] as const;

export const OPERATING_STATUS_OPTIONS = [
  { value: 'operating', label: 'Sudah Beroperasi' },
  { value: 'not_yet', label: 'Belum Beroperasi' },
  { value: 'planning', label: 'Masih Rencana' },
] as const;

export const REFERRAL_SOURCES = [
  'Google', 'Instagram', 'Teman', 'Iklan', 'Facebook', 'TikTok', 'Lainnya',
] as const;

export const ROOM_FACILITIES = ['Wifi', 'AC', 'TV', 'Kamar Mandi Dalam', 'Breakfast', 'Parkir'] as const;
