<script setup lang="ts">
interface Suggestion {
  id: string
  name: string
  label: string
}

interface PlaceDetail {
  name: string
  lat: number
  lng: number
  bbox: [number, number, number, number] | null
}

const props = defineProps<{
  proximity?: { lat: number; lng: number } | null
}>()

const emit = defineEmits<{
  (e: 'select', lat: number, lng: number, address: string, bbox?: [number, number, number, number]): void
  (e: 'locate', lat: number, lng: number): void
}>()

const router = useRouter()

const query = ref('')
const suggestions = ref<Suggestion[]>([])
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
      const result = await $fetch<Suggestion[]>('/api/geocode/suggest', {
        method: 'POST',
        body: {
          q: query.value,
          lat: props.proximity?.lat,
          lng: props.proximity?.lng,
        },
      })
      suggestions.value = result ?? []
      showSuggestions.value = suggestions.value.length > 0
    } catch {
      suggestions.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

async function select(suggestion: Suggestion) {
  showSuggestions.value = false
  query.value = suggestion.name
  loading.value = true

  try {
    const detail = await $fetch<PlaceDetail | null>('/api/geocode/detail', {
      query: { id: suggestion.id },
    })
    if (!detail) return
    emit('select', detail.lat, detail.lng, detail.name, detail.bbox ?? undefined)
    router.push({
      path: '/map',
      query: { lat: detail.lat, lng: detail.lng, address: detail.name },
    })
  } finally {
    loading.value = false
  }
}

async function useCurrentLocation() {
  if (!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      emit('locate', lat, lng)
      router.push({
        path: '/map',
        query: { lat, lng, address: '現在地' },
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
          placeholder="住所・駅名・施設名を入力"
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
        {{ s.label }}
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
