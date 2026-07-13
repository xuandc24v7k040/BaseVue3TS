<script setup lang="ts">
import { Check, MapPin, Search } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface BranchMock {
  id: string
  name: string
}

const branches: BranchMock[] = [
  { id: 'can-tho', name: 'Cần Thơ' },
  { id: 'hau-giang', name: 'Hậu Giang' },
  { id: 'ho-chi-minh', name: 'Hồ Chí Minh' },
  { id: 'ha-noi', name: 'Hà Nội' },
]

const open = ref(false)
const selectedBranch = ref(branches[0]!)
const draftBranch = ref(branches[0]!)
const branchSearch = ref('')

const filteredBranches = computed(() => {
  const query = branchSearch.value.trim().toLocaleLowerCase('vi-VN')
  if (!query) return branches

  return branches.filter((branch) =>
    branch.name.toLocaleLowerCase('vi-VN').includes(query),
  )
})

function openSelector(): void {
  draftBranch.value = selectedBranch.value
  branchSearch.value = ''
  open.value = true
}

function confirmSelection(): void {
  selectedBranch.value = draftBranch.value
  open.value = false
}

function cancelSelection(): void {
  draftBranch.value = selectedBranch.value
  branchSearch.value = ''
  open.value = false
}

function handleOpenChange(nextOpen: boolean): void {
  open.value = nextOpen
  if (!nextOpen) {
    draftBranch.value = selectedBranch.value
    branchSearch.value = ''
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <Button
        type="button"
        variant="outline"
        class="h-11 justify-start gap-2 border-[var(--bookora-border)] bg-transparent px-3 text-[var(--bookora-ink)] shadow-none hover:bg-[var(--bookora-soft)]"
        aria-label="Chọn chi nhánh"
        data-testid="branch-selector-trigger"
        @click="openSelector"
      >
        <MapPin aria-hidden="true" class="size-4.5 text-[var(--bookora-green)]" />
        <span class="text-sm">
          <span class="hidden xl:inline">Chọn chi nhánh: </span>
          <strong class="font-semibold">{{ selectedBranch.name }}</strong>
        </span>
      </Button>
    </DialogTrigger>

    <DialogContent class="bookora-client-theme flex max-h-[min(85svh,42rem)] min-h-0 flex-col gap-0 overflow-hidden border-[var(--bookora-border)] bg-[var(--bookora-cream)] p-0 sm:max-w-lg">
      <DialogHeader class="shrink-0 px-5 pb-4 pt-5 pr-12 sm:px-6 sm:pb-5 sm:pt-6">
        <DialogTitle class="text-xl text-[var(--bookora-ink)]">Chọn chi nhánh</DialogTitle>
        <DialogDescription class="leading-6 text-[var(--bookora-muted)]">
          Chi nhánh được dùng để hiển thị trải nghiệm mua sắm phù hợp.
        </DialogDescription>
      </DialogHeader>

      <div class="relative shrink-0 px-5 pb-4 sm:px-6">
        <Search aria-hidden="true" class="pointer-events-none absolute left-8 top-1/2 size-4 -translate-y-[calc(50%+0.5rem)] text-[var(--bookora-muted)] sm:left-9" />
        <Input
          v-model="branchSearch"
          aria-label="Tìm kiếm chi nhánh"
          placeholder="Tìm theo tên chi nhánh"
          class="h-11 border-[var(--bookora-border)] bg-background pl-10 shadow-none focus-visible:border-[var(--bookora-green)] focus-visible:ring-[var(--bookora-green)]/20"
          data-testid="branch-search"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6" role="radiogroup" aria-label="Danh sách chi nhánh">
        <div v-if="filteredBranches.length > 0" class="grid gap-2">
          <button
            v-for="branch in filteredBranches"
            :key="branch.id"
            type="button"
            role="radio"
            :aria-checked="draftBranch.id === branch.id"
            class="flex min-h-12 items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm font-medium transition-colors hover:border-[var(--bookora-green)] hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            :class="draftBranch.id === branch.id ? 'border-[var(--bookora-green)] bg-[var(--bookora-soft)]' : 'border-[var(--bookora-border)]'"
            @click="draftBranch = branch"
          >
            {{ branch.name }}
            <Check v-if="draftBranch.id === branch.id" aria-hidden="true" class="size-4 text-[var(--bookora-green)]" />
          </button>
        </div>
        <p v-else class="rounded-lg border border-dashed border-[var(--bookora-border)] bg-background px-4 py-8 text-center text-sm text-[var(--bookora-muted)]">
          Không tìm thấy chi nhánh phù hợp.
        </p>
      </div>

      <DialogFooter class="shrink-0 border-t border-[var(--bookora-border)] bg-background/80 px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" class="border-[var(--bookora-border)] sm:min-w-24" @click="cancelSelection">
          Hủy
        </Button>
        <Button
          type="button"
          class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)] sm:min-w-24"
          @click="confirmSelection"
        >
          Xác nhận
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
