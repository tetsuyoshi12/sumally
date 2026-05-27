import type {
  HazardData,
  FacilityDistances,
  HazardBreakdown,
  ConvenienceBreakdown,
} from '~/types'

// ─── ハザードスコア ───────────────────────────────────────────

export function calcHazardScore(data: HazardData): HazardBreakdown {
  const flood =
    data.flood === 'high' ? -30 : data.flood === 'medium' ? -15 : 0
  const landslide = data.landslide ? -20 : 0
  const tsunami = data.tsunami ? -25 : 0
  const liquefaction =
    data.liquefaction === 'high'
      ? -15
      : data.liquefaction === 'medium'
        ? -8
        : 0

  return {
    flood,
    landslide,
    tsunami,
    liquefaction,
    total: flood + landslide + tsunami + liquefaction,
  }
}

// ─── 利便性スコア（距離段階制）────────────────────────────────

export interface ScoreTier {
  maxMeters: number
  points: number
}

/**
 * 施設ごとのスコア段階テーブル。
 * ロジック公開ページからも import して使う（単一の事実源）。
 */
export const CONV_TIERS: Record<keyof Omit<ConvenienceBreakdown, 'total'>, ScoreTier[]> = {
  station: [
    { maxMeters: 200,  points: 20 }, // ほぼ駅前
    { maxMeters: 500,  points: 15 }, // 徒歩6〜7分
    { maxMeters: 1000, points: 10 }, // 徒歩12〜13分
    { maxMeters: 1500, points:  5 }, // 徒歩20分弱
  ],
  hospital: [
    { maxMeters:  500, points: 15 }, // 徒歩7〜8分
    { maxMeters: 1000, points: 10 }, // 徒歩13分
    { maxMeters: 2000, points:  5 }, // 自転車5〜10分
    { maxMeters: 3000, points:  2 }, // 車ですぐ
  ],
  supermarket: [
    { maxMeters:  200, points: 10 }, // 歩いてすぐ
    { maxMeters:  500, points:  7 }, // 徒歩6〜7分
    { maxMeters: 1000, points:  4 }, // 徒歩13分・自転車すぐ
  ],
  convenienceStore: [
    { maxMeters:  100, points: 8 }, // ほぼ目の前
    { maxMeters:  300, points: 5 }, // 徒歩3〜4分
    { maxMeters:  600, points: 2 }, // 徒歩8分以内
  ],
  school: [
    { maxMeters:  300, points: 10 }, // 徒歩5分以内
    { maxMeters:  800, points:  7 }, // 徒歩10分以内
    { maxMeters: 1500, points:  3 }, // 徒歩20分以内
  ],
}

function scoreByDistance(meters: number | null, tiers: ScoreTier[]): number {
  if (meters === null) return 0
  for (const tier of tiers) {
    if (meters <= tier.maxMeters) return tier.points
  }
  return 0
}

export function calcConvenienceScore(
  distances: FacilityDistances,
): ConvenienceBreakdown {
  const station          = scoreByDistance(distances.stationMeters,          CONV_TIERS.station)
  const hospital         = scoreByDistance(distances.hospitalMeters,         CONV_TIERS.hospital)
  const supermarket      = scoreByDistance(distances.supermarketMeters,      CONV_TIERS.supermarket)
  const convenienceStore = scoreByDistance(distances.convenienceStoreMeters, CONV_TIERS.convenienceStore)
  const school           = scoreByDistance(distances.schoolMeters,           CONV_TIERS.school)

  return {
    station,
    hospital,
    supermarket,
    convenienceStore,
    school,
    total: station + hospital + supermarket + convenienceStore + school,
  }
}

// ─── ハザードスコア → カラー（0=色なし、負値=黄→橙→赤→赤黒） ──────

const HAZARD_COLOR_STOPS = [
  { t: 0,    r: 250, g: 204, b:  21 }, // #facc15 黄
  { t: 0.33, r: 249, g: 115, b:  22 }, // #f97316 橙
  { t: 0.67, r: 239, g:  68, b:  68 }, // #ef4444 赤
  { t: 1.0,  r: 127, g:  29, b:  29 }, // #7f1d1d 赤黒
] as const

/**
 * ハザード合計点（0〜-90）を CSS カラー文字列に変換する。
 * score === 0 のとき null を返す（色なし＝デフォルト色を使う）。
 */
export function hazardScoreToColor(score: number): string | null {
  if (score >= 0) return null
  const t = Math.min(1, Math.abs(score) / 90)
  let i = 0
  while (i < HAZARD_COLOR_STOPS.length - 2 && t > HAZARD_COLOR_STOPS[i + 1].t) i++
  const a = HAZARD_COLOR_STOPS[i]
  const b = HAZARD_COLOR_STOPS[i + 1]
  const seg = (t - a.t) / (b.t - a.t)
  const r = Math.round(a.r + (b.r - a.r) * seg)
  const g = Math.round(a.g + (b.g - a.g) * seg)
  const bv = Math.round(a.b + (b.b - a.b) * seg)
  return `rgb(${r}, ${g}, ${bv})`
}

// ─── 偏差値 ──────────────────────────────────────────────────

export function calcDeviation(
  score: number,
  mean: number,
  std: number,
): number {
  if (std === 0) return 50
  return Math.round(50 + (10 * (score - mean)) / std)
}

/** 偏差値から市内上位何%かを概算（正規分布近似） */
export function deviationToTopPercent(deviation: number): number {
  const z = (deviation - 50) / 10
  const p = 0.5 * (1 + erf(z / Math.SQRT2))
  return Math.round((1 - p) * 100)
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const absX = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * absX)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
      0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-absX * absX)
  return sign * y
}
