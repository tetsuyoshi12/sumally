import { calcHazardScore, calcConvenienceScore, calcDeviation } from '~/utils/score'
import type { ScoreResponse, MunicipalityStats } from '~/types'

// 同一座標への連続リクエストをサーバー側でキャッシュ（5分間）
export default defineCachedEventHandler(async (event): Promise<ScoreResponse> => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)
  const address = (query.address as string) ?? ''

  if (isNaN(lat) || isNaN(lng)) {
    throw createError({ statusCode: 400, message: '緯度経度が不正です' })
  }

  const { reinfolibApiKey, googlePlacesApiKey } = useRuntimeConfig()

  // ハザードデータと施設データを並列取得（直接関数呼び出し・HTTPなし）
  const [hazardData, facilityData] = await Promise.all([
    fetchHazardData(lat, lng, reinfolibApiKey),
    fetchFacilitiesData(lat, lng, googlePlacesApiKey),
  ])

  const hazard = calcHazardScore(hazardData)
  const convenience = calcConvenienceScore(facilityData)

  // 市区町村統計（Phase 2 でバッチ処理実装。Phase 1 は null）
  const stats = await getMunicipalityStats(lat, lng)

  const deviation = {
    hazard: stats ? calcDeviation(hazard.total, stats.hazardMean, stats.hazardStd) : null,
    convenience: stats ? calcDeviation(convenience.total, stats.convMean, stats.convStd) : null,
    municipalityId: stats?.municipalityId ?? null,
    municipalityName: stats?.municipalityName ?? null,
  }

  return {
    lat,
    lng,
    address,
    hazard,
    convenience,
    distances: facilityData,
    deviation,
    sources: {
      hazard: '国土交通省 不動産情報ライブラリ',
      facilities: 'Google Places API',
      updatedAt: new Date().toISOString().split('T')[0],
    },
  }
}, {
  maxAge: 60 * 5, // 5分キャッシュ
  getKey: (event) => {
    const q = getQuery(event)
    // 小数点3桁（約100m精度）でキャッシュキーを作成
    const lat = Math.round(parseFloat(q.lat as string) * 1000) / 1000
    const lng = Math.round(parseFloat(q.lng as string) * 1000) / 1000
    return `score:${lat}:${lng}`
  },
})

async function getMunicipalityStats(
  _lat: number,
  _lng: number,
): Promise<MunicipalityStats | null> {
  // TODO Phase 2: Supabase から municipality_stats テーブルを参照
  return null
}
