/** Straight-line distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const km = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
export function formatDistance(value: number) {
  return value < 1 ? `${Math.round(value * 1000 / 50) * 50} m` : `${km.format(value)} km`;
}

/** Directions in Apple Maps on iPhone/iPad, Google Maps everywhere else. */
export function routeUrl(to: { lat: number; lng: number }, apple: boolean) {
  return apple
    ? `https://maps.apple.com/?daddr=${to.lat},${to.lng}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;
}

export function searchUrl(storeName: string, near?: { lat: number; lng: number }) {
  const query = encodeURIComponent(`${storeName} supermercado`);
  return near
    ? `https://www.google.com/maps/search/${query}/@${near.lat},${near.lng},14z`
    : `https://www.google.com/maps/search/?api=1&query=${query}%20Barranquilla`;
}
