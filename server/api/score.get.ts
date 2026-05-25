import { calcHazardScore, calcConvenienceScore, calcDeviation } from '~/utils/score'
import type {
  ScoreResponse,
  MunicipalityStats,
  HazardData,
  FacilityDistances,
} from '~/types'

export default defineEventHandler(async (event): Promise<ScoreResponse> => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)
  const address = (query.address as string) ?? ''

  if (isNaN(lat) || isNaN(lng)) {
    throw createError({ statusCode: 400, message: '緯度経度が不正です' })
  }

  // ハザードデータと施設データを並列取得
  const baseUrl = getRequestURL(event).origin
  const [hazardData, facilityData] = await Promise.all([
    $fetch<HazardData>(`${baseUrl}/api/hazard`, { query: { lat, lng } }),
    $fetch<FacilityDistances>(`${baseUrl}/api/facilities`, { query: { lat, lng } }),
  ])

  const hazard = calcHazardScore(hazardData)
  const convenience = calcConvenienceScore(facilityData)

  // 市区町村統計（Phase 2 でバッチ処理実装。Phase 1 は null を返す）
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
    deviation,
    sources: {
      hazard: '国土交通省 不動産情報ライブラリ',
      facilities: 'Google Places API',
      updatedAt: new Date().toISOString().split('T')[0],
    },
  }
})

// Supabase から市区町村集計値を取得（Phase 1 はスタブ）
async function getMunicipalityStats(
  _lat: number,
  _lng: number,
): Promise<MunicipalityStats | null> {
  // TODO Phase 2: Supabase から municipality_stats テーブルを参照
  // const { data } = await supabase.from('municipality_stats')
  //   .select('*')
  //   .eq('municipality_id', municipalityId)
  //   .single()
  return null
}
