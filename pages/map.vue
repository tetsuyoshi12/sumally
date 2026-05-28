<script setup lang="ts">
import type { ScoreResponse, MapboxGeocodingResponse } from '~/types'

const route = useRoute()
const config = useRuntimeConfig()

// 現在表示中の座標・住所（URLクエリ初期値）
const lat = ref(parseFloat(route.query.lat as string))
const lng = ref(parseFloat(route.query.lng as string))
const address = ref((route.query.address as string) ?? '')

const score = ref<ScoreResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const mapBbox = ref<[number, number, number, number] | null>(null)

async function fetchScore() {
  if (isNaN(lat.value) || isNaN(lng.value)) {
    error.value = '座標が不正です。住所を再入力してください。'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null

  try {
    score.value = await $fetch<ScoreResponse>('/api/score', {
      query: { lat: lat.value, lng: lng.value, address: address.value },
    })
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'スコアの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

// ピン移動時: 逆ジオコーディング → スコア再取得（bbox はリセット）
async function onLocationChanged(pos: { lat: number; lng: number }) {
  mapBbox.value = null
  lat.value = pos.lat
  lng.value = pos.lng
  address.value = await reverseGeocode(pos.lat, pos.lng)
  await fetchScore()
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.public.mapboxToken}&language=ja&limit=1`
    const res = await fetch(url)
    const data = (await res.json()) as MapboxGeocodingResponse
    return data.features[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

// AddressSearch から住所選択イベントを受け取る（router を介さず直接更新）
async function onAddressSelected(newLat: number, newLng: number, newAddress: string, bbox?: [number, number, number, number]) {
  mapBbox.value = bbox ?? null
  lat.value = newLat
  lng.value = newLng
  address.value = newAddress
  await fetchScore()
}

// 初回ロード
onMounted(fetchScore)

// URLで直接アクセス・外部遷移時のフォールバック（emit で既に処理済みの場合はスキップ）
watch(
  () => route.query,
  (query) => {
    const newLat = parseFloat(query.lat as string)
    const newLng = parseFloat(query.lng as string)
    if (isNaN(newLat) || isNaN(newLng)) return
    if (newLat === lat.value && newLng === lng.value) return
    lat.value = newLat
    lng.value = newLng
    address.value = (query.address as string) ?? ''
    fetchScore()
  },
  { deep: true },
)

useHead({
  title: computed(() =>
    address.value ? `${address.value} | SUMALLY` : 'SUMALLY',
  ),
})
</script>

<template>
  <div class="map-page">
    <!-- ヘッダー -->
    <header class="map-header">
      <NuxtLink to="/" class="back-link">← トップへ</NuxtLink>
      <span class="header-title">SUMALLY</span>
      <AddressSearch
        class="header-search"
        :proximity="{ lat, lng }"
        @select="onAddressSelected"
        @locate="(lat, lng) => onLocationChanged({ lat, lng })"
      />
    </header>

    <!-- メインレイアウト -->
    <div class="map-layout">
      <!-- 地図 -->
      <div class="map-area">
        <ClientOnly>
          <MapView
            v-if="!isNaN(lat) && !isNaN(lng)"
            :lat="lat"
            :lng="lng"
            :address="address"
            :bbox="mapBbox"
            :hazard-total="score?.hazard.total ?? 0"
            @location-changed="onLocationChanged"
          />
          <template #fallback>
            <div class="map-placeholder">地図を読み込み中…</div>
          </template>
        </ClientOnly>

      </div>

      <!-- スコアパネル -->
      <aside class="score-area">
        <div v-if="error" class="error-msg">
          <p>{{ error }}</p>
          <NuxtLink to="/">住所を再入力する</NuxtLink>
        </div>

        <ScorePanel
          v-else-if="score || loading"
          :score="score ?? ({} as ScoreResponse)"
          :loading="loading"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.map-page {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.back-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

.header-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--color-primary);
  white-space: nowrap;
}

.header-search {
  flex: 1;
  min-width: 220px;
}

.map-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.map-area {
  flex: 1;
  position: relative;
  min-height: 0;
}

.map-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-sub);
  background: var(--color-bg);
}

.score-area {
  width: 380px;
  flex-shrink: 0;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
}

.error-msg {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--color-hazard);
}

@media (max-width: 768px) {
  .map-layout {
    flex-direction: column;
  }

  .map-area {
    flex: none;
    height: 50dvh;
  }

  .score-area {
    width: 100%;
    flex: 1;
    border-left: none;
    border-top: 1px solid var(--color-border);
  }
}
</style>
