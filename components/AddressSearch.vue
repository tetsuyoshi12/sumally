<script setup lang="ts">
import type { MapboxGeocodingResponse, MapboxFeature } from '~/types'

const config = useRuntimeConfig()
const router = useRouter()

const query = ref('')
const suggestions = ref<MapboxFeature[]>([])
const loading = ref(false)
const showSuggestions = ref(false)

let debounceTimer: ReturnType<typeof setTimeout>

async function onInput() {
  clearTimeout(debounceTimer)
  if (query.value.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const encoded = encodeURIComponent(query.value)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${config.public.mapboxToken}&language=ja&country=jp&limit=5&types=address,place,poi`
      const res = await fetch(url)
      const data = (await res.json()) as MapboxGeocodingResponse
      suggestions.value = data.features ?? []
      showSuggestions.value = true
    } finally {
      loading.value = false
    }
  }, 300)
}

function select(feature: MapboxFeature) {
  const [lng, lat] = feature.center
  query.value = feature.place_name
  showSuggestions.value = false
  router.push({
    path: '/map',
    query: { lat, lng, address: feature.place_name },
  })
}

async function useCurrentLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      router.push({
        path: '/map',
        query: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: '現在地',
        },
      })
    },
    (err) => {
      console.error('位置情報の取得に失敗しました', err)
    },
  )
}

function onBlur() {
  setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}
</script>

<template>
  <div class="search-wrap">
    <div class="input-row">
      <div class="input-box">
        <span class="icon">📍</span>
        <input
          v-model="query"
          type="text"
          placeholder="住所を入力（例：宇都宮市大通り1丁目）"
          autocomplete="off"
          @input="onInput"
          @focus="showSuggestions = suggestions.length > 0"
          @blur="onBlur"
          @keydown.enter="suggestions.length ? select(suggestions[0]) : undefined"
        />
        <span v-if="loading" class="spinner" />
      </div>
      <button class="location-btn" title="現在地を使用" @click="useCurrentLocation">
        現在地
      </button>
    </div>

    <ul v-if="showSuggestions && suggestions.length" class="suggestions">
      <li
        v-for="s in suggestions"
        :key="s.id"
        @mousedown.prevent="select(s)"
      >
        {{ s.place_name }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.search-wrap {
  position: relative;
  width: 100%;
  max-width: 560px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.input-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0 14px;
  transition: border-color 0.2s;
  gap: 8px;
}

.input-box:focus-within {
  border-color: var(--color-primary);
}

.icon {
  font-size: 18px;
  flex-shrink: 0;
}

input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  padding: 14px 0;
  background: transparent;
  color: var(--color-text);
}

input::placeholder {
  color: var(--color-text-sub);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.location-btn {
  padding: 0 20px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.2s;
}

.location-btn:hover {
  background: var(--color-primary-dark);
}

.suggestions {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  list-style: none;
  z-index: 100;
  overflow: hidden;
}

.suggestions li {
  padding: 12px 16px;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s;
}

.suggestions li:last-child {
  border-bottom: none;
}

.suggestions li:hover {
  background: var(--color-bg);
}
</style>
