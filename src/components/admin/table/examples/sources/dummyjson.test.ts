import { describe, expect, it } from 'vitest'
import type { DataTableQuery } from '../../interface'
import {
  createDummyJsonProductsRequest,
  dummyJsonProductsSource,
  mapDummyJsonProductsResponse,
} from './dummyjson'

function baseQuery(overrides: Partial<DataTableQuery> = {}): DataTableQuery {
  return {
    page: 1,
    pageSize: dummyJsonProductsSource.defaultLimit,
    ...overrides,
  }
}

describe('dummyJsonProductsSource', () => {
  it('maps DataTableQuery pagination, search, and sort to DummyJSON params', () => {
    const request = createDummyJsonProductsRequest(
      baseQuery({
        page: 3,
        pageSize: 20,
        search: { value: 'phone', columnIds: ['title'] },
        sort: [{ id: 'price', desc: true }],
      }),
    )

    const url = new URL(request.url)

    expect(request.endpoint).toBe('products/search')
    expect(request.params).toEqual({
      limit: 20,
      skip: 40,
      q: 'phone',
      sortBy: 'price',
      order: 'desc',
    })
    expect(url.origin).toBe(dummyJsonProductsSource.baseUrl)
    expect(url.searchParams.get('limit')).toBe('20')
    expect(url.searchParams.get('skip')).toBe('40')
    expect(url.searchParams.get('q')).toBe('phone')
  })

  it('switches to simulated filter mode when product filters are active', () => {
    const request = createDummyJsonProductsRequest(
      baseQuery({
        page: 2,
        pageSize: 20,
        filters: [{ id: 'category', value: ['beauty'], operator: 'in' }],
      }),
    )

    expect(request.mode).toBe('simulated-filter')
    expect(request.params.limit).toBe(dummyJsonProductsSource.simulatedFilterLimit)
    expect(request.params.skip).toBe(0)
  })

  it('maps DummyJSON response into server-side table page shape', () => {
    const page = mapDummyJsonProductsResponse(
      {
        products: [
          {
            id: 1,
            title: 'Essence Mascara Lash Princess',
            category: 'beauty',
            price: 9.99,
            discountPercentage: 7.17,
            rating: 4.94,
            stock: 5,
            thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
          },
        ],
        total: 194,
        skip: 20,
        limit: 20,
      },
      baseQuery({ page: 2, pageSize: 20 }),
    )

    expect(page.items).toEqual([
      {
        id: 1,
        title: 'Essence Mascara Lash Princess',
        brand: 'Unknown brand',
        category: 'beauty',
        price: 9.99,
        discountPercentage: 7.17,
        rating: 4.94,
        stock: 5,
        availabilityStatus: 'Low stock',
        thumbnail: 'https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp',
      },
    ])
    expect(page.total).toBe(194)
    expect(page.pageCount).toBe(10)
  })

  it('simulates product filters before paginating the response', () => {
    const page = mapDummyJsonProductsResponse(
      {
        products: [
          {
            id: 1,
            title: 'Budget mascara',
            category: 'beauty',
            price: 9,
            discountPercentage: 7,
            rating: 4.8,
            stock: 4,
          },
          {
            id: 2,
            title: 'Luxury perfume',
            category: 'fragrances',
            price: 120,
            discountPercentage: 15,
            rating: 4.6,
            stock: 40,
          },
          {
            id: 3,
            title: 'Everyday lipstick',
            category: 'beauty',
            price: 29,
            discountPercentage: 22,
            rating: 3.8,
            stock: 0,
          },
          {
            id: 4,
            title: 'Premium serum',
            category: 'beauty',
            price: 90,
            discountPercentage: 12,
            rating: 4.7,
            stock: 25,
          },
        ],
        total: 4,
        skip: 0,
        limit: dummyJsonProductsSource.simulatedFilterLimit,
      },
      baseQuery({
        page: 1,
        pageSize: 1,
        sort: [{ id: 'price', desc: true }],
        filters: [
          { id: 'category', value: ['beauty'], operator: 'in' },
          { id: 'ratingRange', value: ['4.5-up'], operator: 'in' },
        ],
      }),
    )

    expect(page.total).toBe(2)
    expect(page.pageCount).toBe(2)
    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.title).toBe('Premium serum')
  })
})
