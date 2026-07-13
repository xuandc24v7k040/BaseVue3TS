// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import ClientHeader from '@/components/client/layout/ClientHeader.vue'

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
      { path: '/account/favorites', component: {} },
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
  })

  it('navigates to the search route with a trimmed query', async () => {
    const { router, wrapper } = await mountHeader()
    const input = wrapper.find<HTMLInputElement>('#desktop-book-search')

    await input.setValue('  sách kỹ năng  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/search?q=s%C3%A1ch+k%E1%BB%B9+n%C4%83ng')
  })

  it('does not navigate when the search query is empty', async () => {
    const { router, wrapper } = await mountHeader()

    await wrapper.find<HTMLInputElement>('#desktop-book-search').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('opens the branch selector and confirms another local branch', async () => {
    const { wrapper } = await mountHeader()

    await wrapper.find('[data-testid="branch-selector-trigger"]').trigger('click')
    await flushPromises()

    expect(document.body.querySelector('[data-slot="dialog-content"]')).not.toBeNull()
    expect(document.body.textContent).toContain('Chọn chi nhánh')
    expect(document.body.textContent).toContain('Hậu Giang')

    const hauGiangButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hậu Giang',
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

    expect(visibleBranches).toEqual(['Hồ Chí Minh'])
    expect(wrapper.text()).toContain('Cần Thơ')
  })

  it('shows an empty state and cancel keeps the last confirmed branch', async () => {
    const { wrapper } = await mountHeader()

    await wrapper.find('[data-testid="branch-selector-trigger"]').trigger('click')
    await flushPromises()

    const hauGiangButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Hậu Giang',
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
