/**
 * Google Place Details で座標・bboxを取得
 * GET /api/geocode/detail?id={placeId}
 */
interface PlaceDetail {
  displayName?: { text: string }
  location?: { latitude: number; longitude: number }
  viewport?: {
    low: { latitude: number; longitude: number }
    high: { latitude: number; longitude: number }
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const placeId = query.id as string
  if (!placeId) return null

  const { googlePlacesApiKey } = useRuntimeConfig()
  if (!googlePlacesApiKey) return null

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask': 'displayName,location,viewport',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('[Geocode/detail] HTTP', res.status, await res.text())
      return null
    }

    const place = (await res.json()) as PlaceDetail
    if (!place.location) return null

    const { latitude: lat, longitude: lng } = place.location
    const vp = place.viewport
    const bbox: [number, number, number, number] | null = vp
      ? [vp.low.longitude, vp.low.latitude, vp.high.longitude, vp.high.latitude]
      : null

    return {
      name: place.displayName?.text ?? '',
      lat,
      lng,
      bbox,
    }
  } catch (e) {
    console.error('[Geocode/detail] 失敗:', e)
    return null
  }
})
