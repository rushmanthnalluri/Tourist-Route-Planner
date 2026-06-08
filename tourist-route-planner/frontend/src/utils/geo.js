/** Haversine distance in km between two lat/lng points */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestAttractionId(lat, lng, attractions) {
  if (!attractions.length) return 0
  let best = attractions[0]
  let bestD = Infinity
  for (const a of attractions) {
    if (a.isCustom) continue
    const d = haversineKm(lat, lng, a.lat, a.lng)
    if (d < bestD) {
      bestD = d
      best = a
    }
  }
  return best.id
}
