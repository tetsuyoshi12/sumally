import type { FacilityDistances } from '~/types'

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby'

// 各施設カテゴリに対応する Google Places タイプ
const FACILITY_TYPES = {
  station: ['train_station', 'subway_station', 'transit_station'],
  hospital: ['hospital', 'clinic'],
  supermarket: ['supermarket', 'grocery_store'],
  school: ['school', 'primary_school', 'secondary_school'],
} as const

interface PlacesFeature {
  location?: { latitude: number; longitude: number }
}

interface PlacesResponse {
  places?: PlacesFeature[]
}

export default defineEventHandler(
  async (event): Promise<FacilityDistances> => {
    const query = getQuery(event)
    const lat = parseFloat(query.lat as string)
    const lng = parseFloat(query.lng as string)

    if (isNaN(lat) || isNaN(lng)) {
      throw createError({ statusCode: 400, message: '緯度経度が不正です' })
    }

    const apiKey = useRuntimeConfig().googlePlacesApiKey
    if (!apiKey) {
      throw createError({ statusCode: 500, message: 'GOOGLE_PLACES_API_KEY が未設定です' })
    }

    const searchNearby = async (
      types: readonly string[],
      radiusMeters: number,
    ): Promise<number | null> => {
      try {
        const res = await fetch(PLACES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.location',
          },
          body: JSON.stringify({
            includedTypes: types,
            maxResultCount: 1,
            rankPreference: 'DISTANCE',
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,
              },
            },
          }),
        })
        if (!res.ok) return null
        const data = (await res.json()) as PlacesResponse
        if (!data.places?.length || !data.places[0].location) return null

        const place = data.places[0].location
        return haversineMeters(lat, lng, place.latitude, place.longitude)
      } catch {
        return null
      }
    }

    const [stationMeters, hospitalMeters, supermarketMeters, schoolMeters] =
      await Promise.all([
        searchNearby(FACILITY_TYPES.station, 2000),
        searchNearby(FACILITY_TYPES.hospital, 2000),
        searchNearby(FACILITY_TYPES.supermarket, 1500),
        searchNearby(FACILITY_TYPES.school, 2000),
      ])

    return { stationMeters, hospitalMeters, supermarketMeters, schoolMeters }
  },
)

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
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
