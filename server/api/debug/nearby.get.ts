/**
 * 開発用デバッグエンドポイント
 * 指定座標周辺の施設とそのGoogle Placesタイプを返す
 * 使い方: /api/debug/nearby?lat=37.49&lng=139.91&radius=500
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const lat    = parseFloat(query.lat    as string)
  const lng    = parseFloat(query.lng    as string)
  const radius = parseFloat((query.radius as string) ?? '500')

  const apiKey = useRuntimeConfig().googlePlacesApiKey

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.displayName,places.types,places.primaryType,places.formattedAddress',
    },
    body: JSON.stringify({
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      // タイプ指定なし → Google が付けているタイプをそのまま確認する
    }),
  })

  return res.json()
})
