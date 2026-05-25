import { latLngToTile, pointInGeoJsonFeature } from '~/utils/tiles'
import type { HazardData, FloodRisk, LiquefactionRisk } from '~/types'

const REINFOLIB_BASE = 'https://api.reinfolib.mlit.go.jp/ex-api/external'
const ZOOM = 15
const LAYER = {
  flood: 'XKT010',
  landslide: 'XKT011',
  tsunami: 'XKT012',
  liquefaction: 'XKT013',
} as const

interface GeoJsonFeature {
  geometry: { type: string; coordinates: unknown }
  properties: Record<string, unknown>
}
interface GeoJsonResponse {
  features?: GeoJsonFeature[]
}

const MOCK_HAZARD: HazardData = {
  flood: 'none',
  landslide: false,
  tsunami: false,
  liquefaction: 'none',
}

export async function fetchHazardData(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<HazardData> {
  if (!apiKey) return MOCK_HAZARD

  const tile = latLngToTile(lat, lng, ZOOM)

  const fetchLayer = async (layerId: string): Promise<GeoJsonResponse | null> => {
    const url = `${REINFOLIB_BASE}/${layerId}?z=${tile.z}&x=${tile.x}&y=${tile.y}`
    try {
      const res = await fetch(url, { headers: { 'X-API-Key': apiKey } })
      if (!res.ok) return null
      return res.json() as Promise<GeoJsonResponse>
    } catch {
      return null
    }
  }

  const [floodGeo, landslideGeo, tsunamiGeo, liquefactionGeo] = await Promise.all([
    fetchLayer(LAYER.flood),
    fetchLayer(LAYER.landslide),
    fetchLayer(LAYER.tsunami),
    fetchLayer(LAYER.liquefaction),
  ])

  return {
    flood: parseFloodRisk(floodGeo, lng, lat),
    landslide: hasFeaturesAt(landslideGeo, lng, lat),
    tsunami: hasFeaturesAt(tsunamiGeo, lng, lat),
    liquefaction: parseLiquefactionRisk(liquefactionGeo, lng, lat),
  }
}

function hasFeaturesAt(geo: GeoJsonResponse | null, lng: number, lat: number): boolean {
  if (!geo?.features?.length) return false
  return geo.features.some((f) => pointInGeoJsonFeature(lng, lat, f))
}

function parseFloodRisk(geo: GeoJsonResponse | null, lng: number, lat: number): FloodRisk {
  if (!geo?.features?.length) return 'none'
  const feature = geo.features.find((f) => pointInGeoJsonFeature(lng, lat, f))
  if (!feature) return 'none'
  const depth =
    (feature.properties.depth as number | undefined) ??
    (feature.properties.A31b_205 as number | undefined)
  if (depth == null) return 'medium'
  return depth >= 5 ? 'high' : 'medium'
}

function parseLiquefactionRisk(geo: GeoJsonResponse | null, lng: number, lat: number): LiquefactionRisk {
  if (!geo?.features?.length) return 'none'
  const feature = geo.features.find((f) => pointInGeoJsonFeature(lng, lat, f))
  if (!feature) return 'none'
  const rank =
    (feature.properties.rank as number | undefined) ??
    (feature.properties.liquefaction_rank as number | undefined)
  if (rank == null) return 'medium'
  return rank === 1 ? 'high' : 'medium'
}
