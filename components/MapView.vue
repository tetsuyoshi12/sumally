<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { hazardScoreToColor } from '~/utils/score'

const props = defineProps<{
  lat: number
  lng: number
  address: string
  bbox?: [number, number, number, number] | null
  hazardTotal?: number
}>()

const emit = defineEmits<{
  locationChanged: [{ lat: number; lng: number }]
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLDivElement | null>(null)
let map: mapboxgl.Map | null = null
let marker: mapboxgl.Marker | null = null
let markerEl: HTMLDivElement | null = null

const PIN_DEFAULT_COLOR = '#2b5be0'

function createMarkerEl(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'map-pin'
  el.style.backgroundColor = PIN_DEFAULT_COLOR
  return el
}

function updatePinColor(score: number) {
  if (!markerEl) return
  markerEl.style.backgroundColor = hazardScoreToColor(score) ?? PIN_DEFAULT_COLOR
}

// ハザードマップポータルサイト 公開タイル
// 出典: 国土交通省ハザードマップポータルサイト https://disaportal.gsi.go.jp/
const HAZARD_LAYERS = [
  {
    id: 'flood',
    label: '洪水',
    emoji: '🌊',
    tileUrl: 'https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png',
  },
  {
    id: 'landslide',
    label: '土砂',
    emoji: '⛰️',
    tileUrl: 'https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki/{z}/{x}/{y}.png',
  },
  {
    id: 'tsunami',
    label: '津波',
    emoji: '🏄',
    tileUrl: 'https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png',
  },
] as const

type LayerId = typeof HAZARD_LAYERS[number]['id']

const activeLayers = ref<Set<LayerId>>(new Set(['flood', 'landslide', 'tsunami']))
const mapReady = ref(false)
const hint = ref(true) // 操作ヒント表示フラグ

function addHazardLayers() {
  if (!map) return
  const firstSymbolId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id

  for (const layer of HAZARD_LAYERS) {
    map.addSource(`src-${layer.id}`, {
      type: 'raster',
      tiles: [layer.tileUrl],
      tileSize: 256,
      attribution: '国土交通省ハザードマップポータルサイト',
    })
    map.addLayer(
      {
        id: `lyr-${layer.id}`,
        type: 'raster',
        source: `src-${layer.id}`,
        paint: {
          'raster-opacity': activeLayers.value.has(layer.id) ? 1.0 : 0,
        },
      },
      firstSymbolId,
    )
  }
  mapReady.value = true
}

function toggleLayer(layerId: LayerId) {
  const next = new Set(activeLayers.value)
  next.has(layerId) ? next.delete(layerId) : next.add(layerId)
  activeLayers.value = next
  map?.setPaintProperty(`lyr-${layerId}`, 'raster-opacity', next.has(layerId) ? 0.88 : 0)
}

function onLocationChange(lngLat: mapboxgl.LngLat) {
  hint.value = false
  marker?.setLngLat(lngLat)
  emit('locationChanged', { lat: lngLat.lat, lng: lngLat.lng })
}

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [props.lng, props.lat],
    zoom: 15,
    language: 'ja', // ① 日本語ラベル
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  // ② ドラッグ可能なカスタムピン
  markerEl = createMarkerEl()
  marker = new mapboxgl.Marker({ element: markerEl, draggable: true })
    .setLngLat([props.lng, props.lat])
    .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<strong>${props.address}</strong>`))
    .addTo(map)

  marker.on('dragend', () => {
    if (marker) onLocationChange(marker.getLngLat())
  })

  map.on('load', addHazardLayers)

  // ② クリック/タップでピン移動
  map.on('click', (e) => {
    onLocationChange(e.lngLat)
  })

  // ヒントを5秒後に自動非表示
  setTimeout(() => { hint.value = false }, 5000)
})

onUnmounted(() => {
  map?.remove()
})

watch(
  () => props.hazardTotal,
  (score) => updatePinColor(score ?? 0),
)

watch(
  () => [props.lat, props.lng] as [number, number],
  ([lat, lng]) => {
    if (!marker || !map) return
    const cur = marker.getLngLat()
    // 外部から座標が変わった時だけ飛ぶ（ドラッグ中は無視）
    if (Math.abs(cur.lat - lat) > 0.0001 || Math.abs(cur.lng - lng) > 0.0001) {
      marker.setLngLat([lng, lat])
      if (props.bbox) {
        // 区・市・ランドマーク等: 境界ボックスに合わせてズーム自動調整
        map.fitBounds(props.bbox, { padding: 80, maxZoom: 16 })
      } else {
        // 具体的な住所: 番地レベルで表示
        map.flyTo({ center: [lng, lat], zoom: 15 })
      }
    }
  },
)
</script>

<template>
  <div class="map-wrap">
    <div ref="mapContainer" class="map-container" />

    <!-- 操作ヒント -->
    <Transition name="fade">
      <div v-if="hint" class="map-hint">
        クリック / タップでピンを移動
      </div>
    </Transition>

    <!-- ハザード表示切替パネル -->
    <div v-if="mapReady" class="layer-control">
      <p class="layer-title">ハザード表示</p>
      <div class="layer-buttons">
        <button
          v-for="layer in HAZARD_LAYERS"
          :key="layer.id"
          :class="['layer-btn', { active: activeLayers.has(layer.id) }]"
          @click="toggleLayer(layer.id)"
        >
          <span>{{ layer.emoji }}</span>
          <span>{{ layer.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* カスタムマーカー */
:global(.map-pin) {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  cursor: grab;
  transition: background-color 0.6s ease;
}

:global(.map-pin:active) {
  cursor: grabbing;
}

/* 操作ヒント */
.map-hint {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ハザード切替パネル */
.layer-control {
  position: absolute;
  bottom: 32px;
  left: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.layer-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-sub);
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.layer-buttons {
  display: flex;
  gap: 6px;
}

.layer-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1.5px solid var(--color-border);
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-sub);
  transition: all 0.15s;
  cursor: pointer;
}

.layer-btn:hover {
  border-color: var(--color-hazard);
  color: var(--color-hazard);
}

.layer-btn.active {
  background: var(--color-hazard);
  border-color: var(--color-hazard);
  color: #fff;
}
</style>
