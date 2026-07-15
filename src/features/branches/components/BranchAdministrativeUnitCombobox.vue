<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, ChevronsUpDown, LoaderCircle, RotateCcw, Search } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { normalizeAdministrativeName } from '../adapters/administrative-unit.adapter'
import type { AdministrativeUnitOption } from '../types'

const props = withDefaults(defineProps<{
  modelValue: number | null
  options: AdministrativeUnitOption[]
  placeholder: string
  searchPlaceholder: string
  fallbackLabel?: string
  loading?: boolean
  error?: boolean
  disabled?: boolean
}>(), {
  fallbackLabel: '',
  loading: false,
  error: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  retry: []
}>()

const open = ref(false)
const search = ref('')
const activeIndex = ref(0)
const searchInput = ref<InstanceType<typeof Input> | null>(null)
const selected = computed(() => props.options.find((option) => option.code === props.modelValue))
const filteredOptions = computed(() => {
  const query = normalizeAdministrativeName(search.value)
  if (!query) return props.options
  return props.options.filter((option) => normalizeAdministrativeName(option.name).includes(query))
})
const displayLabel = computed(() => selected.value?.name || props.fallbackLabel || props.placeholder)

watch(open, async (isOpen) => {
  if (!isOpen) return
  search.value = ''
  activeIndex.value = 0
  await nextTick()
  searchInput.value?.$el?.focus()
})

watch(filteredOptions, () => {
  activeIndex.value = Math.min(activeIndex.value, Math.max(filteredOptions.value.length - 1, 0))
})

function selectOption(option: AdministrativeUnitOption): void {
  emit('update:modelValue', option.code)
  open.value = false
}

function onSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, filteredOptions.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const option = filteredOptions.value[activeIndex.value]
    if (option) selectOption(option)
  }
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        :disabled="disabled"
        class="w-full justify-between font-normal"
      >
        <span :class="cn('truncate', !selected && !fallbackLabel && 'text-muted-foreground')">
          {{ displayLabel }}
        </span>
        <LoaderCircle v-if="loading" class="ml-2 h-4 w-4 shrink-0 animate-spin" />
        <ChevronsUpDown v-else class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="z-[70] w-[var(--reka-popover-trigger-width)] p-0"
      align="start"
      :side-offset="6"
      :collision-padding="16"
      :avoid-collisions="true"
    >
      <div class="border-b p-2">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref="searchInput"
            v-model="search"
            class="h-9 pl-9"
            :placeholder="searchPlaceholder"
            @keydown="onSearchKeydown"
          />
        </div>
      </div>
      <div v-if="error" class="space-y-2 p-4 text-center text-sm">
        <p class="text-destructive">Không thể tải danh mục hành chính.</p>
        <Button type="button" size="sm" variant="outline" @click="emit('retry')">
          <RotateCcw class="mr-2 h-4 w-4" />Thử lại
        </Button>
      </div>
      <div v-else-if="loading" class="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircle class="h-4 w-4 animate-spin" />Đang tải...
      </div>
      <p v-else-if="filteredOptions.length === 0" class="p-6 text-center text-sm text-muted-foreground">
        Không tìm thấy kết quả.
      </p>
      <ScrollArea v-else class="h-[min(16rem,calc(100dvh-10rem))]">
        <div role="listbox" class="p-1">
          <button
            v-for="(option, index) in filteredOptions"
            :id="`administrative-option-${option.code}`"
            :key="option.code"
            type="button"
            role="option"
            :aria-selected="option.code === modelValue"
            :class="cn(
              'flex w-full items-center rounded-sm px-2 py-2 text-left text-sm outline-none',
              index === activeIndex && 'bg-accent text-accent-foreground',
            )"
            @mouseenter="activeIndex = index"
            @click="selectOption(option)"
          >
            <Check :class="cn('mr-2 h-4 w-4', option.code === modelValue ? 'opacity-100' : 'opacity-0')" />
            {{ option.name }}
          </button>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>
