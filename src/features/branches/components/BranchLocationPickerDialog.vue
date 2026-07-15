<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Crosshair, LoaderCircle, LocateFixed, MapPin, Search } from '@lucide/vue'
import { toast } from 'vue-sonner'
import type { VietMapSuggestionResponseDto } from '@/api/generated/models'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  autocompleteBranchLocation,
  resolveBranchPlace,
  reverseBranchLocation,
} from '../api/branch-api'
import { toBranchLocation } from '../adapters/vietmap-location.adapter'
import {
  parseBranchCoordinates,
  verifyVietnamAdministrativeLocation,
  type VietnamLocationVerification,
} from '../adapters/vietnam-coordinate.validator'
import { listVietnamProvinces, listVietnamWards } from '../api/province-api'
import {
  geolocationMessage,
  getBrowserLocation,
  type GeolocationFailure,
} from '../composables/use-browser-geolocation'
import type { BranchLocation, VietnamProvince, VietnamWard } from '../types'
import BranchMap from './BranchMap.vue'

const props = defineProps<{
  open: boolean
  initialLocation: BranchLocation | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirm: [location: BranchLocation]
  clear: []
}>()

const mapRef = ref<InstanceType<typeof BranchMap> | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const draft = ref<BranchLocation | null>(null)
const latitudeInput = ref('')
const longitudeInput = ref('')
const searchText = ref('')
const suggestions = ref<VietMapSuggestionResponseDto[]>([])
const isResolving = ref(false)
const isSearching = ref(false)
const isLocating = ref(false)
const mapUnavailable = ref(false)
const verification = ref<VietnamLocationVerification>({ status: 'idle' })
let provinceCatalog: VietnamProvince[] | null = null
const wardCatalog = new Map<number, VietnamWard[]>()
let reverseSequence = 0
let reverseController: AbortController | null = null
let searchController: AbortController | null = null
let locationController: AbortController | null = null
let searchTimer: number | undefined
let resizeFrame: number | undefined
let mapResizeObserver: ResizeObserver | null = null

const canConfirm = computed(() => (
  draft.value !== null && verification.value.status === 'valid' && !isResolving.value
))

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      cancelRequests()
      stopMapResizeObserver()
      return
    }
    draft.value = props.initialLocation ? { ...props.initialLocation } : null
    latitudeInput.value = draft.value ? String(draft.value.latitude) : ''
    longitudeInput.value = draft.value ? String(draft.value.longitude) : ''
    searchText.value = ''
    suggestions.value = []
    mapUnavailable.value = false
    verification.value = { status: 'idle' }
    await nextTick()
    startMapResizeObserver()
    scheduleMapResize()
    if (draft.value) {
      void reverse({
        latitude: draft.value.latitude,
        longitude: draft.value.longitude,
      })
    }
  },
)

watch(searchText, (value) => {
  window.clearTimeout(searchTimer)
  searchController?.abort()
  const text = value.trim()
  if (text.length < 2) {
    suggestions.value = []
    isSearching.value = false
    return
  }
  searchTimer = window.setTimeout(() => void search(text), 300)
})

function cancelRequests(): void {
  reverseController?.abort()
  reverseSequence += 1
  searchController?.abort()
  window.clearTimeout(searchTimer)
  locationController?.abort()
}

function scheduleMapResize(): void {
  if (resizeFrame !== undefined) window.cancelAnimationFrame(resizeFrame)
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = undefined
    mapRef.value?.resize()
  })
}

function startMapResizeObserver(): void {
  stopMapResizeObserver()
  if (!bodyRef.value || typeof ResizeObserver === 'undefined') return
  mapResizeObserver = new ResizeObserver(scheduleMapResize)
  mapResizeObserver.observe(bodyRef.value)
}

function stopMapResizeObserver(): void {
  mapResizeObserver?.disconnect()
  mapResizeObserver = null
  if (resizeFrame !== undefined) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = undefined
  }
}

function cleanup(): void {
  cancelRequests()
  stopMapResizeObserver()
}

onBeforeUnmount(cleanup)

async function setCoordinate(coordinate: { latitude: number; longitude: number }): Promise<void> {
  const parsed = parseBranchCoordinates(String(coordinate.latitude), String(coordinate.longitude))
  if (!parsed.valid) {
    verification.value = { status: 'invalid', message: parsed.message }
    toast.error(parsed.message)
    return
  }
  latitudeInput.value = String(coordinate.latitude)
  longitudeInput.value = String(coordinate.longitude)
  draft.value = {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    province: draft.value?.province ?? null,
    ward: draft.value?.ward ?? null,
    address: draft.value?.address ?? '',
    displayAddress: draft.value?.displayAddress ?? '',
  }
  mapRef.value?.flyTo(draft.value)
  await reverse(coordinate)
}

async function loadProvinceCatalog(signal: AbortSignal): Promise<VietnamProvince[]> {
  if (provinceCatalog) return provinceCatalog
  const result = await listVietnamProvinces(signal)
  if (signal.aborted) throw signal.reason
  provinceCatalog = result
  return result
}

async function loadWardCatalog(provinceCode: number, signal: AbortSignal): Promise<VietnamWard[]> {
  const cached = wardCatalog.get(provinceCode)
  if (cached) return cached
  const result = await listVietnamWards(provinceCode, signal)
  if (signal.aborted) throw signal.reason
  wardCatalog.set(provinceCode, result)
  return result
}

async function reverse(coordinate: { latitude: number; longitude: number }): Promise<void> {
  reverseController?.abort()
  const controller = new AbortController()
  reverseController = controller
  const sequence = ++reverseSequence
  isResolving.value = true
  verification.value = { status: 'pending' }
  try {
    const response = await reverseBranchLocation(coordinate, controller.signal)
    if (sequence !== reverseSequence || controller.signal.aborted) return
    const resolvedLocation = toBranchLocation(response.data)
    draft.value = resolvedLocation
    latitudeInput.value = String(draft.value.latitude)
    longitudeInput.value = String(draft.value.longitude)
    const result = await verifyVietnamAdministrativeLocation(
      resolvedLocation,
      () => loadProvinceCatalog(controller.signal),
      (provinceCode) => loadWardCatalog(provinceCode, controller.signal),
    )
    if (sequence !== reverseSequence || controller.signal.aborted) return
    verification.value = result
  } catch (error) {
    if (controller.signal.aborted) return
    const message = 'Không thể xác minh tọa độ vào lúc này. Vui lòng thử lại hoặc nhập địa chỉ thủ công mà không lưu tọa độ.'
    verification.value = { status: 'network-error', message }
    toast.warning(message)
  } finally {
    if (sequence === reverseSequence) isResolving.value = false
  }
}

async function search(text: string): Promise<void> {
  const controller = new AbortController()
  searchController = controller
  isSearching.value = true
  try {
    const focus = draft.value
      ? { focusLatitude: draft.value.latitude, focusLongitude: draft.value.longitude }
      : {}
    const response = await autocompleteBranchLocation({ text, ...focus }, controller.signal)
    if (!controller.signal.aborted) suggestions.value = response.data
  } catch {
    if (!controller.signal.aborted) toast.warning('Không thể tìm địa điểm lúc này.')
  } finally {
    if (!controller.signal.aborted) isSearching.value = false
  }
}

async function selectSuggestion(suggestion: VietMapSuggestionResponseDto): Promise<void> {
  searchController?.abort()
  isSearching.value = true
  try {
    const response = await resolveBranchPlace({ reference: suggestion.refId })
    const location = toBranchLocation(response.data)
    suggestions.value = []
    searchText.value = suggestion.displayAddress
    await setCoordinate({
      latitude: location.latitude,
      longitude: location.longitude,
    })
  } catch {
    toast.error('Không thể tải thông tin địa điểm đã chọn.')
  } finally {
    isSearching.value = false
  }
}

async function useCurrentLocation(): Promise<void> {
  if (isLocating.value) return
  locationController?.abort()
  locationController = new AbortController()
  isLocating.value = true
  try {
    await setCoordinate(await getBrowserLocation({ signal: locationController.signal }))
  } catch (reason) {
    if (locationController.signal.aborted) return
    toast.warning(geolocationMessage(reason as GeolocationFailure))
  } finally {
    isLocating.value = false
  }
}

function applyManualCoordinates(): void {
  const parsed = parseBranchCoordinates(latitudeInput.value, longitudeInput.value)
  if (!parsed.valid) {
    verification.value = { status: 'invalid', message: parsed.message }
    toast.error(parsed.message)
    return
  }
  void setCoordinate(parsed.coordinate)
}

function clearCoordinates(): void {
  cancelRequests()
  draft.value = null
  latitudeInput.value = ''
  longitudeInput.value = ''
  verification.value = { status: 'idle' }
  emit('clear')
  close()
}

function close(): void {
  emit('update:open', false)
}

function confirm(): void {
  if (!draft.value) return
  emit('confirm', { ...draft.value })
  close()
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex h-[min(92dvh,900px)] max-h-[calc(100dvh-2rem)] max-w-5xl flex-col overflow-hidden p-0">
      <DialogHeader class="shrink-0 border-b px-5 pb-4 pt-5 sm:px-6">
        <DialogTitle class="flex items-center gap-2">
          <MapPin class="h-5 w-5 text-primary" />
          Định vị chi nhánh trên bản đồ
        </DialogTitle>
        <DialogDescription>
          Tìm địa điểm, dùng vị trí hiện tại, click bản đồ, kéo ghim hoặc nhập tọa độ.
        </DialogDescription>
      </DialogHeader>

      <div ref="bodyRef" class="flex h-0 min-h-0 flex-1 flex-col overflow-hidden [&_[data-slot=scroll-area-thumb]]:bg-muted-foreground/45">
        <ScrollArea type="auto" class="h-full min-h-0 w-full flex-1 overflow-hidden">
          <div class="space-y-4 px-5 pb-6 pt-4 sm:px-6">
            <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input v-model="searchText" class="pl-9" placeholder="Tìm địa điểm (ít nhất 2 ký tự)..." aria-label="Tìm địa điểm" />
          <LoaderCircle v-if="isSearching" class="absolute right-3 top-3 h-4 w-4 animate-spin" />
          <div v-if="suggestions.length" class="absolute z-[70] mt-1 max-h-52 w-full overflow-auto rounded-md border bg-background p-1 shadow-lg">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion.refId"
              type="button"
              class="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
              @click="selectSuggestion(suggestion)"
            >
              {{ suggestion.displayAddress }}
            </button>
          </div>
            </div>

            <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" :disabled="isLocating" @click="useCurrentLocation">
            <LoaderCircle v-if="isLocating" class="mr-2 h-4 w-4 animate-spin" />
            <LocateFixed v-else class="mr-2 h-4 w-4" />
            {{ isLocating ? 'Đang định vị...' : 'Vị trí hiện tại' }}
          </Button>
          <Button type="button" variant="outline" :disabled="!draft || isLocating" @click="draft && mapRef?.flyTo(draft)">
            <Crosshair class="mr-2 h-4 w-4" />
            Về ghim
          </Button>
            </div>

            <div v-if="mapUnavailable" role="alert" class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Không thể tải bản đồ. Bạn vẫn có thể nhập tọa độ bên dưới.
            </div>
            <BranchMap
              v-else
              ref="mapRef"
              :location="draft"
              height-class="h-[clamp(240px,34dvh,280px)] md:h-[clamp(300px,38dvh,340px)] lg:h-[clamp(360px,42dvh,420px)]"
              @coordinate="setCoordinate"
              @error="mapUnavailable = true"
            />

            <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div class="space-y-2">
            <Label for="branch-latitude">Vĩ độ (Latitude)</Label>
            <Input id="branch-latitude" v-model="latitudeInput" inputmode="decimal" placeholder="10.0452" @keydown.enter.prevent="applyManualCoordinates" />
          </div>
          <div class="space-y-2">
            <Label for="branch-longitude">Kinh độ (Longitude)</Label>
            <Input id="branch-longitude" v-model="longitudeInput" inputmode="decimal" placeholder="105.7469" @keydown.enter.prevent="applyManualCoordinates" />
          </div>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" :disabled="isResolving" @click="applyManualCoordinates">Áp dụng tọa độ</Button>
            <Button type="button" variant="ghost" :disabled="!draft && !initialLocation" @click="clearCoordinates">Xóa tọa độ</Button>
          </div>
            </div>

            <div
              v-if="verification.message"
              role="alert"
              class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {{ verification.message }}
            </div>

            <div v-if="draft?.displayAddress" class="rounded-lg border bg-muted/40 p-3 text-sm">
              <strong>Địa chỉ nhận diện:</strong> {{ draft.displayAddress }}
            </div>
          </div>
        </ScrollArea>
      </div>

      <DialogFooter class="shrink-0 border-t bg-background px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" class="w-full sm:w-auto" @click="close">Hủy</Button>
        <Button type="button" class="w-full sm:w-auto" :disabled="!canConfirm" @click="confirm">
          <LoaderCircle v-if="isResolving" class="mr-2 h-4 w-4 animate-spin" />
          Xác nhận vị trí
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
