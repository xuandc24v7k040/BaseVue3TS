import { describe, expect, it } from 'vitest'
import {
  selectProductCategory,
  setProductPrimaryCategory,
  unselectProductCategory,
  type ProductCategorySelection,
} from './product-primary-category'

const state = (
  categoryIds: string[] = [],
  primaryCategoryId: string | null = null,
): ProductCategorySelection => ({ categoryIds, primaryCategoryId })

describe('product primary category state', () => {
  it('selects the first category as primary and preserves it when more are selected', () => {
    const value = state()
    selectProductCategory(value, 'a')
    selectProductCategory(value, 'b')
    expect(value).toEqual({ categoryIds: ['a', 'b'], primaryCategoryId: 'a' })
  })

  it('only sets a selected category as primary', () => {
    const value = state(['a'], 'a')
    setProductPrimaryCategory(value, 'b')
    expect(value.primaryCategoryId).toBe('a')
  })

  it('preserves primary when removing a secondary category', () => {
    const value = state(['a', 'b'], 'a')
    unselectProductCategory(value, 'b', ['a', 'b'])
    expect(value).toEqual({ categoryIds: ['a'], primaryCategoryId: 'a' })
  })

  it('reconciles a removed primary by stable UI order and clears the last one', () => {
    const value = state(['a', 'b', 'c'], 'b')
    unselectProductCategory(value, 'b', ['c', 'a', 'b'])
    expect(value.primaryCategoryId).toBe('c')
    unselectProductCategory(value, 'c', ['c', 'a', 'b'])
    expect(value.primaryCategoryId).toBe('a')
    unselectProductCategory(value, 'a', ['c', 'a', 'b'])
    expect(value.primaryCategoryId).toBeNull()
  })

  it('does not silently assign a primary to hydrated legacy state', () => {
    expect(state(['a', 'b']).primaryCategoryId).toBeNull()
  })
})
