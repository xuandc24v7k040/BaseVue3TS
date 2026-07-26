export interface ProductCategorySelection {
  categoryIds: string[]
  primaryCategoryId: string | null
}

export function selectProductCategory(state: ProductCategorySelection, categoryId: string): void {
  if (!state.categoryIds.includes(categoryId)) state.categoryIds.push(categoryId)
  state.primaryCategoryId ??= categoryId
}

export function unselectProductCategory(
  state: ProductCategorySelection,
  categoryId: string,
  orderedCategoryIds: readonly string[],
): void {
  const index = state.categoryIds.indexOf(categoryId)
  if (index >= 0) state.categoryIds.splice(index, 1)
  if (state.primaryCategoryId !== categoryId) return
  state.primaryCategoryId = orderedCategoryIds.find((id) => state.categoryIds.includes(id)) ?? null
}

export function setProductPrimaryCategory(state: ProductCategorySelection, categoryId: string): void {
  if (state.categoryIds.includes(categoryId)) state.primaryCategoryId = categoryId
}
