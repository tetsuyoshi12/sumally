import type {
  HazardData,
  FacilityDistances,
  HazardBreakdown,
  ConvenienceBreakdown,
} from '~/types'

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

export function calcConvenienceScore(
  distances: FacilityDistances,
): ConvenienceBreakdown {
  const station =
    distances.stationMeters !== null
      ? distances.stationMeters <= 300
        ? 20
        : distances.stationMeters <= 1000
          ? 10
          : 0
      : 0

  const hospital =
    distances.hospitalMeters !== null && distances.hospitalMeters <= 1000
      ? 15
      : 0

  const supermarket =
    distances.supermarketMeters !== null && distances.supermarketMeters <= 500
      ? 10
      : 0

  const school =
    distances.schoolMeters !== null && distances.schoolMeters <= 1000 ? 10 : 0

  return {
    station,
    hospital,
    supermarket,
    school,
    total: station + hospital + supermarket + school,
  }
}

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
