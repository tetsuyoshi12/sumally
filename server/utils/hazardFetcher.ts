import { latLngToTile, pointInGeoJsonFeature } from '~/utils/tiles'
import type { HazardData, FloodRisk, LiquefactionRisk } from '~/types'

// ドキュメント: https://www.reinfolib.mlit.go.jp/help/apiManual/
const REINFOLIB_BASE = 'https://www.reinfolib.mlit.go.jp/ex-api/external'
const ZOOM = 15

const LAYER = {
  flood:        'XKT026', // 洪水浸水想定区域（想定最大規模）
  landslide:    'XKT029', // 土砂災害警戒区域
  tsunami:      'XKT028', // 津波浸水想定
  liquefaction: 'XKT025', // 液状化の発生傾向図
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
): Promise<HazardData | null> {
  if (!apiKey) return MOCK_HAZARD

  const tile = latLngToTile(lat, lng, ZOOM)

  const fetchLayer = async (layerId: string): Promise<GeoJsonResponse | null> => {
    const url = `${REINFOLIB_BASE}/${layerId}?response_format=geojson&z=${tile.z}&x=${tile.x}&y=${tile.y}`
    try {
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) {
        console.error(`[REINFOLIB] ${layerId} HTTP ${res.status}:`, await res.text())
        return null
      }
      return await res.json() as GeoJsonResponse
    } catch (e) {
      console.error(`[REINFOLIB] ${layerId} fetch失敗:`, e)
      return null
    }
  }

  const [floodGeo, landslideGeo, tsunamiGeo, liquefactionGeo] = await Promise.all([
    fetchLayer(LAYER.flood),
    fetchLayer(LAYER.landslide),
    fetchLayer(LAYER.tsunami),
    fetchLayer(LAYER.liquefaction),
  ])

  // 全レイヤーが null = タイムアウト or 通信エラー → null を返して呼び出し元に通知
  if ([floodGeo, landslideGeo, tsunamiGeo, liquefactionGeo].every(g => g === null)) {
    console.error('[REINFOLIB] 全レイヤー取得失敗（タイムアウトの可能性）')
    return null
  }

  const result: HazardData = {
    flood:        parseFloodRisk(floodGeo, lng, lat),
    landslide:    hasFeaturesAt(landslideGeo, lng, lat),
    tsunami:      hasFeaturesAt(tsunamiGeo, lng, lat),
    liquefaction: parseLiquefactionRisk(liquefactionGeo, lng, lat),
  }

  console.log(`[REINFOLIB] lat=${lat} lng=${lng} →`, JSON.stringify(result))
  return result
}

function hasFeaturesAt(geo: GeoJsonResponse | null, lng: number, lat: number): boolean {
  if (!geo?.features?.length) return false
  return geo.features.some((f) => pointInGeoJsonFeature(lng, lat, f))
}

function parseFloodRisk(geo: GeoJsonResponse | null, lng: number, lat: number): FloodRisk {
  if (!geo?.features?.length) return 'none'
  const feature = geo.features.find((f) => pointInGeoJsonFeature(lng, lat, f))
  if (!feature) return 'none'

  // A31a_205: 浸水深ランク（整数）
  // 1: 0〜0.5m, 2: 0.5〜3m, 3: 3〜5m, 4: 5〜10m, 5: 10m以上
  const rank = Number(feature.properties.A31a_205 ?? 0)
  if (rank >= 4) return 'high'   // 5m以上 → -30点
  if (rank >= 2) return 'medium' // 0.5m〜5m → -15点
  return 'none'
}

function parseLiquefactionRisk(geo: GeoJsonResponse | null, lng: number, lat: number): LiquefactionRisk {
  if (!geo?.features?.length) return 'none'
  const feature = geo.features.find((f) => pointInGeoJsonFeature(lng, lat, f))
  if (!feature) return 'none'

  // liquefaction_tendency_level: 6段階（数値が大きいほどリスク高）
  const level = Number(feature.properties.liquefaction_tendency_level ?? 0)
  if (level >= 5) return 'high'   // -15点
  if (level >= 3) return 'medium' // -8点
  return 'none'
}
