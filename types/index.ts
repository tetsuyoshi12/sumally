export type FloodRisk = 'high' | 'medium' | 'none'
export type LiquefactionRisk = 'high' | 'medium' | 'none'

export interface HazardData {
  flood: FloodRisk
  landslide: boolean
  tsunami: boolean
  liquefaction: LiquefactionRisk
}

export interface FacilityDistances {
  stationMeters: number | null
  stationName: string | null
  hospitalMeters: number | null
  hospitalName: string | null
  supermarketMeters: number | null
  supermarketName: string | null
  convenienceStoreMeters: number | null
  convenienceStoreName: string | null
  schoolMeters: number | null
  schoolName: string | null
}

export interface HazardBreakdown {
  flood: number
  landslide: number
  tsunami: number
  liquefaction: number
  total: number
}

export interface ConvenienceBreakdown {
  station: number
  hospital: number
  supermarket: number
  convenienceStore: number
  school: number
  total: number
}

export interface DeviationInfo {
  hazard: number | null
  convenience: number | null
  municipalityId: string | null
  municipalityName: string | null
}

export interface ScoreResponse {
  lat: number
  lng: number
  address: string
  hazardAvailable: boolean
  hazard: HazardBreakdown
  convenience: ConvenienceBreakdown
  distances: FacilityDistances
  deviation: DeviationInfo
  sources: DataSources
}

export interface DataSources {
  hazard: string
  facilities: string
  updatedAt: string
}

export interface MunicipalityStats {
  municipalityId: string
  municipalityName: string
  hazardMean: number
  hazardStd: number
  convMean: number
  convStd: number
  updatedAt: string
}

export interface MapboxFeature {
  id: string
  place_name: string
  center: [number, number]
  bbox?: [number, number, number, number] // [minLng, minLat, maxLng, maxLat]
  place_type: string[]
}

export interface MapboxGeocodingResponse {
  features: MapboxFeature[]
}
