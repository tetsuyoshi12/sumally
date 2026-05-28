import type { FacilityDistances } from '~/types'

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby'

const FACILITY_TYPES = {
  // transit_station はバス停を含むため除外
  station: ['train_station', 'subway_station', 'light_rail_station'],
  // clinic / doctor / medical_lab は新Places APIで無効タイプのため hospital のみ
  hospital: ['hospital'],
  supermarket: ['supermarket', 'grocery_store'],
  convenienceStore: ['convenience_store'],
  school: ['primary_school'],
} as const

interface PlacesFeature {
  location?: { latitude: number; longitude: number }
  displayName?: { text: string }
  primaryType?: string
}
interface PlacesResponse {
  places?: PlacesFeature[]
}

const MOCK_FACILITIES: FacilityDistances = {
  stationMeters: 250,          stationName: '（モック）駅',
  hospitalMeters: 800,         hospitalName: '（モック）病院',
  supermarketMeters: 400,      supermarketName: '（モック）スーパー',
  convenienceStoreMeters: 180, convenienceStoreName: '（モック）コンビニ',
  schoolMeters: 600,           schoolName: '（モック）学校',
}

export async function fetchFacilitiesData(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<FacilityDistances> {
  if (!apiKey) return MOCK_FACILITIES

  const searchNearby = async (
    types: readonly string[],
    radiusMeters: number,
    label: string,
  ): Promise<{ meters: number; name: string } | null> => {
    try {
      const res = await fetch(PLACES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.location,places.displayName,places.primaryType',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          includedTypes: types,
          maxResultCount: 5,
          rankPreference: 'DISTANCE',
          languageCode: 'ja',
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`[Places API] ${label} HTTP ${res.status}:`, text)
        return null
      }

      const data = (await res.json()) as PlacesResponse

      if (!data.places?.length) {
        console.warn(`[Places API] ${label} → 結果なし (radius=${radiusMeters}m)`)
        return null
      }

      for (const place of data.places) {
        console.log(`[Places API] ${label} → ${place.displayName?.text} (${place.primaryType}) loc=${!!place.location}`)
        // primaryType が指定タイプに一致するもののみ採用（誤判定防止）
        const primaryOk = !place.primaryType || (types as readonly string[]).includes(place.primaryType)
        if (place.location && primaryOk) {
          return {
            meters: haversineMeters(lat, lng, place.location.latitude, place.location.longitude),
            name: place.displayName?.text ?? label,
          }
        }
      }

      console.warn(`[Places API] ${label} → location を持つエントリなし`)
      return null
    } catch (e) {
      console.error(`[Places API] ${label} 例外:`, e)
      return null
    }
  }

  const [station, hospital, supermarket, convenienceStore, school] =
    await Promise.all([
      searchNearby(FACILITY_TYPES.station,          2000, '駅'),
      searchNearby(FACILITY_TYPES.hospital,         3000, '病院'),
      searchNearby(FACILITY_TYPES.supermarket,      1500, 'スーパー'),
      searchNearby(FACILITY_TYPES.convenienceStore, 1000, 'コンビニ'),
      searchNearby(FACILITY_TYPES.school,           2000, '学校'),
    ])

  return {
    stationMeters:          station?.meters          ?? null,
    stationName:            station?.name            ?? null,
    hospitalMeters:         hospital?.meters         ?? null,
    hospitalName:           hospital?.name           ?? null,
    supermarketMeters:      supermarket?.meters      ?? null,
    supermarketName:        supermarket?.name        ?? null,
    convenienceStoreMeters: convenienceStore?.meters ?? null,
    convenienceStoreName:   convenienceStore?.name   ?? null,
    schoolMeters:           school?.meters           ?? null,
    schoolName:             school?.name             ?? null,
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}
