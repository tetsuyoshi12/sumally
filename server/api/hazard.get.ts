import { latLngToTile, pointInGeoJsonFeature } from '~/utils/tiles'
import type { HazardData, FloodRisk, LiquefactionRisk } from '~/types'

const REINFOLIB_BASE = 'https://api.reinfolib.mlit.go.jp/ex-api/external'
const ZOOM = 15

// 不動産情報ライブラリ レイヤーID
// https://www.reinfolib.mlit.go.jp/help/apiManual/
const LAYER = {
  flood: 'XKT010',       // 洪水浸水想定区域（想定最大規模）
  landslide: 'XKT011',  // 土砂災害警戒区域
  tsunami: 'XKT012',    // 津波浸水想定区域
  liquefaction: 'XKT013', // 液状化危険度
} as const

interface GeoJsonFeature {
  geometry: { type: string; coordinates: unknown }
  properties: Record<string, unknown>
}

interface GeoJsonResponse {
  features?: GeoJsonFeature[]
}

export default defineEventHandler(async (event): Promise<HazardData> => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)

  if (isNaN(lat) || isNaN(lng)) {
    throw createError({ statusCode: 400, message: '緯度経度が不正です' })
  }

  const apiKey = useRuntimeConfig().reinfolibApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'REINFOLIB_API_KEY が未設定です' })
  }

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

  const [floodGeo, landslideGeo, tsunamiGeo, liquefactionGeo] =
    await Promise.all([
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
})

function hasFeaturesAt(
  geo: GeoJsonResponse | null,
  lng: number,
  lat: number,
): boolean {
  if (!geo?.features?.length) return false
  return geo.features.some((f) => pointInGeoJsonFeature(lng, lat, f))
}

function parseFloodRisk(
  geo: GeoJsonResponse | null,
  lng: number,
  lat: number,
): FloodRisk {
  if (!geo?.features?.length) return 'none'
  const feature = geo.features.find((f) => pointInGeoJsonFeature(lng, lat, f))
  if (!feature) return 'none'

  // 浸水深（m）をプロパティから取得
  // 実際のプロパティ名は API ドキュメントで要確認
  const depth =
    (feature.properties.depth as number | undefined) ??
    (feature.properties.A31b_205 as number | undefined)

  if (depth == null) return 'medium'
  return depth >= 5 ? 'high' : 'medium'
}

function parseLiquefactionRisk(
  geo: GeoJsonResponse | null,
  lng: number,
  lat: number,
): LiquefactionRisk {
  if (!geo?.features?.length) return 'none'
  const feature = geo.features.find((f) => pointInGeoJsonFeature(lng, lat, f))
  if (!feature) return 'none'

  // 危険度ランク: 1=高, 2=中（実際のプロパティ名は API ドキュメントで要確認）
  const rank =
    (feature.properties.rank as number | undefined) ??
    (feature.properties.liquefaction_rank as number | undefined)

  if (rank == null) return 'medium'
  return rank === 1 ? 'high' : 'medium'
}
