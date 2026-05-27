/**
 * 開発用デバッグエンドポイント
 * 不動産情報ライブラリAPIの生レスポンスを返す
 * 使い方: /api/debug/hazard?lat=35.68&lng=139.76
 */
import { latLngToTile } from '~/utils/tiles'

const REINFOLIB_BASE = 'https://www.reinfolib.mlit.go.jp/ex-api/external'
const ZOOM = 15

const LAYERS = {
  flood:        'XKT026',
  landslide:    'XKT029',
  tsunami:      'XKT028',
  liquefaction: 'XKT025',
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)

  const apiKey = useRuntimeConfig().reinfolibApiKey
  if (!apiKey) return { error: 'NUXT_REINFOLIB_API_KEY が未設定' }

  const tile = latLngToTile(lat, lng, ZOOM)
  const results: Record<string, unknown> = {
    tile,
    apiKeyPrefix: apiKey.slice(0, 8) + '...',
  }

  for (const [name, layerId] of Object.entries(LAYERS)) {
    const url = `${REINFOLIB_BASE}/${layerId}?response_format=geojson&z=${tile.z}&x=${tile.x}&y=${tile.y}`
    try {
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey },
      })
      const text = await res.text()
      if (!res.ok) {
        results[name] = { status: res.status, error: text }
        continue
      }
      const json = JSON.parse(text)
      results[name] = {
        status: res.status,
        featureCount: json.features?.length ?? 0,
        sample: json.features?.[0] ?? null,
      }
    } catch (e) {
      results[name] = { error: String(e) }
    }
  }

  return results
})
