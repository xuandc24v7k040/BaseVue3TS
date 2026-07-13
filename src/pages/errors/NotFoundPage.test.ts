// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { describe, expect, it } from 'vitest'
import NotFoundPage from './NotFoundPage.vue'

describe('NotFoundPage', () => {
  it('renders and allows navigation back to a valid route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'client-home', component: { template: '<h1>Trang chủ</h1>' } },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage, meta: { skipAuthBootstrap: true } },
      ],
    })
    const wrapper = mount(RouterView, { global: { plugins: [router] } })
    await router.push('/route-khong-ton-tai')
    await router.isReady()

    expect(wrapper.text()).toContain('Không tìm thấy trang')
    await wrapper.get('a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('client-home')
  })
})
