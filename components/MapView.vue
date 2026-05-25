<script setup lang="ts">
import mapboxgl from 'mapbox-gl'

const props = defineProps<{
  lat: number
  lng: number
  address: string
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLDivElement | null>(null)
let map: mapboxgl.Map | null = null
let marker: mapboxgl.Marker | null = null

onMounted(() => {
  if (!mapContainer.value) return

  mapboxgl.accessToken = config.public.mapboxToken

  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [props.lng, props.lat],
    zoom: 15,
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')

  marker = new mapboxgl.Marker({ color: '#2b5be0' })
    .setLngLat([props.lng, props.lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<strong>${props.address}</strong>`,
      ),
    )
    .addTo(map)
})

onUnmounted(() => {
  map?.remove()
})

watch(
  () => [props.lat, props.lng] as [number, number],
  ([lat, lng]) => {
    map?.flyTo({ center: [lng, lat], zoom: 15 })
    marker?.setLngLat([lng, lat])
  },
)
</script>

<template>
  <div ref="mapContainer" class="map-container" />
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
