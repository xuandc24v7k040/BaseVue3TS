import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { StorefrontBranchResponseDto } from '@/api/generated/models'
import { STORAGE_KEYS } from '@/constants/storage-key.constant'
import { queryClient } from '@/lib/query-client'

function readPersistedBranchId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.storefrontBranch)
  }
  catch {
    return null
  }
}

export const useStorefrontBranchStore = defineStore('storefront-branch', () => {
  const branches = ref<StorefrontBranchResponseDto[]>([])
  const selectedBranchId = ref<string | null>(readPersistedBranchId())
  const initialized = ref(false)
  const selectedBranch = computed(
    () => branches.value.find(branch => branch.id === selectedBranchId.value) ?? null,
  )

  function initialize(nextBranches: StorefrontBranchResponseDto[]): void {
    branches.value = [...nextBranches]
    const persistedIsActive = nextBranches.some(branch => branch.id === selectedBranchId.value)
    selectedBranchId.value = persistedIsActive ? selectedBranchId.value : (nextBranches[0]?.id ?? null)
    persist()
    initialized.value = true
  }

  function persist(): void {
    try {
      if (selectedBranchId.value) localStorage.setItem(STORAGE_KEYS.storefrontBranch, selectedBranchId.value)
      else localStorage.removeItem(STORAGE_KEYS.storefrontBranch)
    }
    catch {
      // Persistence is best effort; the in-memory storefront remains usable.
    }
  }

  async function select(branchId: string): Promise<boolean> {
    if (!branches.value.some(branch => branch.id === branchId)) return false
    if (selectedBranchId.value === branchId) return true
    selectedBranchId.value = branchId
    persist()
    await queryClient.invalidateQueries({
      predicate: query => query.queryKey[0] === 'storefront-availability',
    })
    return true
  }

  return {
    branches,
    selectedBranchId,
    selectedBranch,
    initialized,
    initialize,
    select,
  }
})
