/**
 * Google Places Autocomplete を使った住所・施設・駅名サジェスト
 * POST /api/geocode/suggest
 * body: { q: string, lat?: number, lng?: number }
 */
interface PlacePrediction {
  placeId: string
  text?: { text: string }
  structuredFormat?: {
    mainText: { text: string }
    secondaryText?: { text: string }
  }
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: PlacePrediction
    queryPrediction?: unknown // 無視する
  }>
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const q: string = body.q ?? ''
  const lat: number | undefined = body.lat
  const lng: number | undefined = body.lng

  if (!q || q.length < 2) return []

  const { googlePlacesApiKey } = useRuntimeConfig()
  if (!googlePlacesApiKey) return []

  const payload: Record<string, unknown> = {
    input: q,
    includedRegionCodes: ['jp'],
    languageCode: 'ja',
  }

  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    payload.locationBias = {
      circle: {
        center: { latitude: Number(lat), longitude: Number(lng) },
        radius: 50000,
      },
    }
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googlePlacesApiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('[Geocode/suggest] HTTP', res.status, await res.text())
      return []
    }

    const data = (await res.json()) as AutocompleteResponse
    console.log('[Geocode/suggest] 件数:', data.suggestions?.length ?? 0, 'q=', q)

    return (data.suggestions ?? [])
      .filter((s) => s.placePrediction != null) // queryPrediction を除外
      .map((s) => {
        const p = s.placePrediction!
        const main = p.structuredFormat?.mainText?.text ?? p.text?.text ?? q
        const sub = p.structuredFormat?.secondaryText?.text
        return {
          id: p.placeId,
          name: p.text?.text ?? main,
          label: sub ? `${main}　${sub}` : main,
        }
      })
  } catch (e) {
    console.error('[Geocode/suggest] 失敗:', e)
    return []
  }
})
