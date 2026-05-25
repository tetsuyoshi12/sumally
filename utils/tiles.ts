/** Web Mercator タイル座標変換 */
export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number; z: number } {
  const z = zoom
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, z),
  )
  return { x, y, z }
}

type Ring = [number, number][]

/** Ray casting アルゴリズムによる点包含判定（座標は [lng, lat] 順） */
export function pointInRing(point: [number, number], ring: Ring): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function pointInGeoJsonFeature(
  lng: number,
  lat: number,
  feature: { geometry: { type: string; coordinates: unknown } },
): boolean {
  const { type, coordinates } = feature.geometry
  const pt: [number, number] = [lng, lat]

  if (type === 'Polygon') {
    const rings = coordinates as Ring[]
    return pointInRing(pt, rings[0])
  }
  if (type === 'MultiPolygon') {
    const polys = coordinates as Ring[][]
    return polys.some((poly) => pointInRing(pt, poly[0]))
  }
  return false
}
