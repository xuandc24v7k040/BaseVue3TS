<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as vietmapgl from '@vietmap/vietmap-gl-js/dist/vietmap-gl'
import '@vietmap/vietmap-gl-js/dist/vietmap-gl.css'
import { env } from '@/lib/env'
import type { BranchLocation } from '../types'

const DEFAULT_CENTER: [number, number] = [105.7469, 10.0452]

const props = withDefaults(defineProps<{
  location?: BranchLocation | null
  interactive?: boolean
  heightClass?: string
}>(), {
  location: null,
  interactive: true,
  heightClass: 'h-[min(52vh,460px)] min-h-72',
})

const emit = defineEmits<{
  coordinate: [coordinates: { latitude: number; longitude: number }]
  error: []
}>()

const container = ref<HTMLElement | null>(null)
let map: vietmapgl.Map | null = null
let marker: vietmapgl.Marker | null = null

function coordinates(location = props.location): [number, number] {
  return location ? [location.longitude, location.latitude] : DEFAULT_CENTER
}

function ensureMarker(location: BranchLocation | null | undefined): void {
  if (!map || !location) {
    marker?.remove()
    marker = null
    return
  }
  if (!marker) {
    marker = new vietmapgl.Marker({ draggable: props.interactive })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)
    if (props.interactive) {
      marker.on('dragend', () => {
        const point = marker?.getLngLat()
        if (point) emit('coordinate', { latitude: point.lat, longitude: point.lng })
      })
    }
  } else {
    marker.setLngLat([location.longitude, location.latitude])
  }
}

onMounted(async () => {
  if (!container.value || !env.vietMapTilemapKey) {
    emit('error')
    return
  }
  map = new vietmapgl.Map({
    container: container.value,
    style: `https://maps.vietmap.vn/maps/styles/tm/style.json?apikey=${encodeURIComponent(env.vietMapTilemapKey)}`,
    center: coordinates(),
    zoom: props.location ? 15 : 6,
    interactive: props.interactive,
  })
  map.addControl(new vietmapgl.NavigationControl(), 'top-right')
  map.on('error', () => emit('error'))
  if (props.interactive) {
    map.on('click', (event) => {
      emit('coordinate', {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      })
    })
  }
  ensureMarker(props.location)
  await nextTick()
  map.resize()
})

watch(
  () => props.location,
  (location) => ensureMarker(location),
  { deep: true },
)

function flyTo(location: BranchLocation): void {
  map?.flyTo({ center: [location.longitude, location.latitude], zoom: 16 })
}

function resize(): void {
  map?.resize()
}

onBeforeUnmount(() => {
  marker?.remove()
  marker = null
  map?.remove()
  map = null
})

defineExpose({ flyTo, resize })
</script>

<template>
  <div
    ref="container"
    :class="['w-full overflow-hidden rounded-xl border bg-muted', heightClass]"
    role="application"
    :aria-label="interactive ? 'Bản đồ chọn vị trí chi nhánh' : 'Bản đồ vị trí chi nhánh'"
  />
</template>
