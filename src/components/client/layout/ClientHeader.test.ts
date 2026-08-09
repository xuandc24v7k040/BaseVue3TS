// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import ClientHeader from '@/components/client/layout/ClientHeader.vue'

vi.mock('@/features/storefront/api/storefront-api', async () => {
  const { ref } = await import('vue')
  const query = <T>(data: T) => ({ data: ref(data), isPending: ref(false), isFetching: ref(false), isError: ref(false), error: ref(null), refetch: vi.fn() })
  return {
    useStorefrontCategoriesQuery: () => query([
      { id: '01J00000000000000000000000', name: 'Văn học', slug: 'van-hoc', imageUrl: null, sortOrder: 1, children: [{ id: '01J00000000000000000000001', name: 'Tiểu thuyết', slug: 'tieu-thuyet', imageUrl: null, sortOrder: 1, children: [] }] },
    ]),
    useStorefrontBranchesQuery: () => query([
      { id: '01J00000000000000000000000', code: 'can-tho', name: 'Cần Thơ', address: 'Ninh Kiều', province: 'Cần Thơ', ward: null },
      { id: '01J00000000000000000000001', code: 'hau-giang', name: 'Hậu Giang', address: 'Vị Thanh', province: 'Hậu Giang', ward: null },
      { id: '01J00000000000000000000002', code: 'ho-chi-minh', name: 'Hồ Chí Minh', address: 'Quận 1', province: 'Hồ Chí Minh', ward: null },
    ]),
    useStorefrontSearchSuggestionsQuery: () => query({ items: [], total: 0 }),
  }
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: {} },
      { path: '/search', component: {} },
      { path: '/books', component: {} },
      { path: '/login', component: {} },
      { path: '/register', component: {} },
      { path: '/cart', component: {} },
      { path: '/account/wishlist', component: {} },
    ],
  })
}

async function mountHeader() {
  const router = createTestRouter()
  await router.push('/')
  const wrapper = mount(ClientHeader, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), router],
    },
  })

  return { router, wrapper }
}

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('ClientHeader', () => {
  it('renders the Bookora brand, search and customer actions', async () => {
    const { wrapper } = await mountHeader()

    expect(wrapper.text()).toContain('BOOKORA')
    expect(wrapper.find('input[placeholder="Bạn đang tìm sách gì?"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Tất cả danh mục')
    expect(wrapper.text()).toContain('Đăng nhập')
    expect(wrapper.text()).toContain('Yêu thích')
    expect(wrapper.text()).toContain('Giỏ hàng')
    expect(wrapper.text()).toContain('Cần Thơ')
    expect(wrapper.get('[data-testid="branch-selector-trigger"]').text().trim()).toBe('Cần Thơ')
  })

  it('navigates to the search route with a trimmed query', async () => {
    const { router, wrapper } = await mountHeader()
    await router.push('/books?page=4&author=j-k-rowling')
    const input = wrapper.find<HTMLInputElement>('#desktop-book-search')

    await input.setValue('  sách kỹ năng  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/books')
    expect(router.currentRoute.value.query).toMatchObject({
      q: 'sách kỹ năng',
      author: 'j-k-rowling',
    })
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('left-aligns the desktop wishlist labels', async () => {
    const { wrapper } = await mountHeader()
    const wishlist = wrapper.findAll('button').find(button => button.text().includes('Danh sách yêu thích'))

    expect(wishlist?.find('span.hidden').classes()).toEqual(
      expect.arrayContaining(['flex-col', 'items-start', 'text-left', 'xl:flex']),
    )
  })

  it('uses a pointer cursor on every wishlist and cart click target', async () => {
    const { wrapper } = await mountHeader()
    const desktopWishlist = wrapper
      .findAll('button')
      .find(button => button.text().includes('Danh sách yêu thích'))
    const desktopCart = wrapper
      .findAll('button')
      .find(button => button.text().includes('Giỏ hàng'))

    expect(desktopWishlist?.classes()).toContain('cursor-pointer')
    expect(desktopCart?.classes()).toContain('cursor-pointer')
    expect(wrapper.get('button[aria-label="Yêu thích"]').classes()).toContain('cursor-pointer')
    expect(wrapper.get('button[aria-label="Giỏ hàng"]').classes()).toContain('cursor-pointer')
  })

  it('navigates desktop and mobile wishlist actions to the canonical route', async () => {
    const { router, wrapper } = await mountHeader()
    const desktopWishlist = wrapper
      .findAll('button')
      .find(button => button.text().includes('Danh sách yêu thích'))

    await desktopWishlist?.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/account/wishlist')

    await router.push('/')
    await wrapper.get('button[aria-label="Yêu thích"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/account/wishlist')
  })

  it('does not navigate when the search query is empty', async () => {
    const { router, wrapper } = await mountHeader()

    await wrapper.find<HTMLInputElement>('#desktop-book-search').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('opens the live panel, stores submitted history and closes with Escape', async () => {
    const { wrapper } = await mountHeader()
    const input = wrapper.get<HTMLInputElement>('#desktop-book-search')

    await input.trigger('focus')
    expect(wrapper.text()).toContain('Gợi ý phù hợp')
    expect(wrapper.text()).toContain('Gợi ý tìm kiếm')
    expect(wrapper.text()).not.toContain('Từ khóa phổ biến')
    expect(wrapper.text()).toContain('Văn học')
    expect(wrapper.text()).toContain('Tiểu thuyết')

    await input.setValue('  Chú   Thuật  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('bookora.search-history.v1') ?? '[]')).toEqual([
      'Chú Thuật',
    ])

    await input.trigger('focus')
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.text()).not.toContain('Gợi ý phù hợp')
  })

  it('submits a search suggestion derived from public categories', async () => {
    const { router, wrapper } = await mountHeader()
    const input = wrapper.get<HTMLInputElement>('#desktop-book-search')

    await input.trigger('focus')
    const suggestion = wrapper
      .findAll('button')
      .find(button => button.text().trim() === 'Tiểu thuyết')
    await suggestion?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/books')
    expect(router.currentRoute.value.query.q).toBe('Tiểu thuyết')
  })

  it('opens the branch selector and confirms another local branch', async () => {
    const { wrapper } = await mountHeader()

    await wrapper.find('[data-testid="branch-selector-trigger"]').trigger('click')
    await flushPromises()

    expect(document.body.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Chọn chi nhánh')
    expect(document.body.textContent).toContain('Hậu Giang')

    const hauGiangButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Hậu Giang'),
    )
    hauGiangButton?.click()
    await flushPromises()

    const confirmButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Xác nhận',
    )
    confirmButton?.click()
    await flushPromises()

    expect(wrapper.text()).toContain('Hậu Giang')
  })

  it('filters branches locally without changing the confirmed branch', async () => {
    const { wrapper } = await mountHeader()

    await wrapper.find('[data-testid="branch-selector-trigger"]').trigger('click')
    await flushPromises()

    const searchInput = document.body.querySelector<HTMLInputElement>(
      '[data-testid="branch-search"]',
    )
    expect(searchInput).not.toBeNull()

    if (searchInput) {
      searchInput.value = 'hỒ'
      searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await flushPromises()

    const visibleBranches = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
    ).map((button) => button.textContent?.trim())

    expect(visibleBranches).toHaveLength(1)
    expect(visibleBranches[0]).toContain('Hồ Chí Minh')
    expect(wrapper.text()).toContain('Cần Thơ')
  })

  it('shows an empty state and cancel keeps the last confirmed branch', async () => {
    const { wrapper } = await mountHeader()

    await wrapper.find('[data-testid="branch-selector-trigger"]').trigger('click')
    await flushPromises()

    const hauGiangButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Hậu Giang'),
    )
    hauGiangButton?.click()
    await flushPromises()

    const cancelButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hủy',
    )
    cancelButton?.click()
    await flushPromises()

    expect(wrapper.text()).toContain('Cần Thơ')
    expect(wrapper.text()).not.toContain('Hậu Giang')

    await wrapper.find('[data-testid="branch-selector-trigger"]').trigger('click')
    await flushPromises()

    const searchInput = document.body.querySelector<HTMLInputElement>(
      '[data-testid="branch-search"]',
    )
    if (searchInput) {
      searchInput.value = 'không tồn tại'
      searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await flushPromises()

    expect(document.body.textContent).toContain('Không tìm thấy chi nhánh phù hợp.')
  })
})
