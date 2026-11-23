/** Haversine distance in meters between two lat/lng points. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export function getCurrentPosition(timeoutMs = 12000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung perangkat ini.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      err => reject(new Error(err.message || 'Gagal mendapatkan lokasi.')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}

export function isInsideWorkSite(
  pos: GeoPosition,
  site: { lat: number; lng: number; radius_m: number },
): boolean {
  return distanceMeters(pos.latitude, pos.longitude, site.lat, site.lng) <= site.radius_m;
}

/** Probe internal URL reachable only on office LAN (proxy for office WiFi). */
export async function probeOfficeNetwork(pingUrl: string, timeoutMs = 4000): Promise<boolean> {
  if (!pingUrl?.trim()) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    await fetch(pingUrl, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export function isLikelyOnWifi(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }).connection;
  return conn?.type === 'wifi' || conn?.effectiveType === 'wifi';
}
