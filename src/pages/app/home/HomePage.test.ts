// @vitest-environment happy-dom

import { mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/pages/app/home/HomePage.vue'

vi.mock('@/features/storefront/api/storefront-api', async () => {
  const { ref } = await import('vue')
  const product = (name: string, slug: string, rank: number | null = null) => ({
    id: slug.padEnd(26, '0').slice(0, 26),
    name,
    slug,
    authors: [{ id: '01J00000000000000000000000', name: 'Tác giả', slug: 'tac-gia' }],
    publisher: null,
    primaryImage: { id: '01J00000000000000000000000', url: '/cover.webp', altText: null, sortOrder: 0, isPrimary: true },
    price: { current: 80_000, original: 100_000, onSale: true, discountPercent: 20 },
    releaseDate: null,
    rank,
  })
  const query = <T>(data: T) => ({
    data: ref(data), isPending: ref(false), isError: ref(false), isSuccess: ref(true), error: ref(null), refetch: vi.fn(),
  })
  return {
    useStorefrontCategoriesQuery: () => query([
      { id: '01J00000000000000000000000', name: 'Văn học', slug: 'van-hoc', imageUrl: null, sortOrder: 1, children: [] },
    ]),
    useStorefrontHomeQuery: () => query({
      bestSellers: [product('Đắc Nhân Tâm', 'dac-nhan-tam', 1), product('Nhà Giả Kim', 'nha-gia-kim', 2), product('Atomic Habits', 'atomic-habits', 3), product('Sapiens', 'sapiens', 4), product('Think Again', 'think-again', 5)],
      newest: [product('Sách mới thật', 'sach-moi')],
      upcoming: [{ ...product('Sách sắp phát hành thật', 'sap-phat-hanh'), releaseDate: '2027-01-01T00:00:00.000Z' }],
    }),
    useStorefrontProductSummariesQuery: () => query([]),
  }
})

describe('HomePage', () => {
  it('renders the approved hierarchy from public API data', () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub } },
    })
    expect(wrapper.text()).toContain('Đọc sách hôm nay')
    expect(wrapper.text()).toContain('Văn học')
    expect(wrapper.text()).toContain('Sách bán chạy')
    expect(wrapper.text()).toContain('Ưu đãi thành viên')
    expect(wrapper.text()).toContain('Sách mới thật')
    expect(wrapper.text()).toContain('Sách sắp phát hành thật')
    expect(wrapper.text()).toContain('Phát hành 01-01-2027')
    expect(wrapper.text()).toContain('Đắc Nhân Tâm')
    expect(wrapper.text()).toContain('Think Again')
    const upcoming = wrapper
      .findAllComponents(RouterLinkStub)
      .find(link => link.text().includes('Sách sắp phát hành thật'))
    expect(upcoming?.classes()).toContain('min-h-72')
    expect(upcoming?.find('img').classes()).toContain('h-40')
  })

  it('points primary hero actions to compatible product routes', () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [createPinia()], stubs: { RouterLink: RouterLinkStub } },
    })
    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.find(link => link.text() === 'Khám phá ngay')?.props('to')).toBe('/books')
    expect(links.find(link => link.text() === 'Sách mới')?.props('to')).toBe('/books?sort=new')
  })
})
