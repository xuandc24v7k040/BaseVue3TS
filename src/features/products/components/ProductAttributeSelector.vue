<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { refDebounced } from '@vueuse/core'
import { ChevronDown, LoaderCircle, Plus, RefreshCcw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { listProductAttributes } from '@/features/product-attributes/api/product-attribute-api'
import { productAttributeKeys } from '@/features/product-attributes/api/product-attribute-query-keys'
import type { ProductAttributeDefinition } from '../utils/product-attribute-values'

const props = defineProps<{ selectedIds: string[] }>()
const emit = defineEmits<{
  select: [ProductAttributeDefinition]
  create: []
}>()

const open = ref(false)
const search = ref('')
const debouncedSearch = refDebounced(search, 250)
const params = computed(() => ({
  page: 1,
  limit: 50,
  search: debouncedSearch.value.trim() || undefined,
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
}))
const query = useQuery({
  queryKey: computed(() => productAttributeKeys.list(params.value)),
  queryFn: ({ signal }) => listProductAttributes(params.value, undefined, signal),
  enabled: open,
})
const available = computed(() => (query.data.value?.data ?? []).filter(
  (attribute) => !props.selectedIds.includes(attribute.id),
))

function select(attribute: ProductAttributeDefinition): void {
  emit('select', attribute)
  open.value = false
  search.value = ''
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="outline" :aria-expanded="open">
        <Plus class="mr-2 h-4 w-4" />Thêm thuộc tính<ChevronDown class="ml-2 h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="z-50 w-[min(92vw,28rem)] p-0" align="start">
      <Command>
        <CommandInput v-model="search" placeholder="Tìm theo tên hoặc mã thuộc tính" />
        <CommandList>
          <div v-if="query.isPending.value" class="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <LoaderCircle class="h-4 w-4 animate-spin" />Đang tải thuộc tính...
          </div>
          <div v-else-if="query.isError.value" class="space-y-2 p-3 text-sm text-destructive">
            <p>Không thể tải danh sách thuộc tính.</p>
            <Button type="button" size="sm" variant="outline" @click="query.refetch()">
              <RefreshCcw class="mr-2 h-4 w-4" />Thử lại
            </Button>
          </div>
          <template v-else>
            <CommandItem v-for="attribute in available" :key="attribute.id" @click="select(attribute)">
              <span class="min-w-0 flex-1 truncate">{{ attribute.name }}</span>
              <span class="text-xs text-muted-foreground">{{ attribute.type }}</span>
            </CommandItem>
            <p v-if="available.length === 0" class="p-3 text-sm text-muted-foreground">
              Không có thuộc tính phù hợp chưa được chọn.
            </p>
          </template>
          <CommandItem class="border-t font-medium" @click="emit('create'); open = false">
            <Plus class="h-4 w-4" />Tạo thuộc tính mới
          </CommandItem>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
