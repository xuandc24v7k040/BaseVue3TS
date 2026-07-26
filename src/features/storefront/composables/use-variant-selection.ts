import { computed, ref, watch } from 'vue'
import type { MaybeRef } from 'vue'
import { unref } from 'vue'
import type { PublicProductDetailDto, PublicVariantDto } from '@/api/generated/models'

export type VariantQuantities = Readonly<Record<string, number>>

export function useVariantSelection(
  product: MaybeRef<PublicProductDetailDto | null>,
  variantQuantities: MaybeRef<VariantQuantities | null>,
) {
  const selectedVariantId = ref<string | null>(null)
  const selectedVariant = computed<PublicVariantDto | null>(() => {
    const current = unref(product)
    if (!current) return null
    return current.variants.find(variant => variant.id === selectedVariantId.value)
      ?? null
  })
  const displayedVariant = computed<PublicVariantDto | null>(() => {
    const current = unref(product)
    if (!current) return null
    return selectedVariant.value
      ?? current.variants.find(variant => variant.isDefault)
      ?? current.variants[0]
      ?? null
  })

  watch(
    [
      () => unref(product)?.slug,
      () => unref(variantQuantities),
    ],
    () => {
      const current = unref(product)
      if (!current) {
        selectedVariantId.value = null
        return
      }

      const selectionStillExists = current.variants.some(
        variant => variant.id === selectedVariantId.value,
      )
      if (!selectionStillExists) {
        selectedVariantId.value = current.variants.find(variant => variant.isDefault)?.id
          ?? current.variants[0]?.id
          ?? null
      }

      const quantities = unref(variantQuantities)
      if (!quantities) return
      const selectedQuantity = selectedVariantId.value
        ? quantities[selectedVariantId.value]
        : undefined
      if (selectedQuantity !== undefined && selectedQuantity > 0) return

      selectedVariantId.value = current.variants.find(
        variant => (quantities[variant.id] ?? 0) > 0,
      )?.id ?? null
    },
    { immediate: true },
  )

  function selectVariant(variantId: string): void {
    const quantities = unref(variantQuantities)
    if (
      quantities
      && (quantities[variantId] ?? 0) > 0
      && unref(product)?.variants.some(variant => variant.id === variantId)
    ) {
      selectedVariantId.value = variantId
    }
  }

  return {
    selectedVariantId,
    selectedVariant,
    displayedVariant,
    selectVariant,
  }
}
