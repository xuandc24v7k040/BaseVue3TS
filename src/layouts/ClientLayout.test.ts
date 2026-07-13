// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createPinia } from 'pinia'
import ClientLayout from '@/layouts/ClientLayout.vue'

describe('ClientLayout', () => {
  it('renders the shared header, routed content and footer shell', () => {
    const wrapper = mount(ClientLayout, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ClientHeader: { template: '<header data-testid="client-header" />' },
          RouterView: { template: '<section data-testid="client-route-content" />' },
          ClientFooter: { template: '<footer data-testid="client-footer" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="client-header"]').exists()).toBe(true)
    expect(wrapper.find('main [data-testid="client-route-content"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="client-footer"]').exists()).toBe(true)
  })
})
