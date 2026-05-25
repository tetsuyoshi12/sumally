import type { HazardData } from '~/types'

export default defineEventHandler(async (event): Promise<HazardData> => {
  const query = getQuery(event)
  const lat = parseFloat(query.lat as string)
  const lng = parseFloat(query.lng as string)

  if (isNaN(lat) || isNaN(lng)) {
    throw createError({ statusCode: 400, message: '緯度経度が不正です' })
  }

  const apiKey = useRuntimeConfig().reinfolibApiKey
  return fetchHazardData(lat, lng, apiKey)
})
