import { computed, ref, watch } from 'vue'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import type { PublicProductDetailDto, PublicVariantDto } from '@/api/generated/models'

export function useVariantSelection(product: MaybeRef<PublicProductDetailDto | null>) {
  const selectedVariantId = ref<string | null>(null)
  const selectedVariant = computed<PublicVariantDto | null>(() => {
    const current = unref(product)
    if (!current) return null
    return current.variants.find(variant => variant.id === selectedVariantId.value)
      ?? current.variants.find(variant => variant.isDefault)
      ?? current.variants[0]
      ?? null
  })

  watch(
    () => unref(product)?.slug,
    () => {
      const current = unref(product)
      selectedVariantId.value = current?.variants.find(variant => variant.isDefault)?.id
        ?? current?.variants[0]?.id
        ?? null
    },
    { immediate: true },
  )

  function selectVariant(variantId: string): void {
    if (unref(product)?.variants.some(variant => variant.id === variantId)) {
      selectedVariantId.value = variantId
    }
  }

  return { selectedVariantId, selectedVariant, selectVariant }
}
