// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { RouterLinkStub } from '@vue/test-utils'
import HomePage from '@/pages/app/home/HomePage.vue'

describe('HomePage', () => {
  it('renders the approved homepage hierarchy and key mock books', () => {
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Đọc sách hôm nay')
    expect(wrapper.text()).toContain('Văn học')
    expect(wrapper.text()).toContain('Sách bán chạy')
    expect(wrapper.text()).toContain('Ưu đãi thành viên')
    expect(wrapper.text()).toContain('Sách mới')
    expect(wrapper.text()).toContain('Sách sắp phát hành')
    expect(wrapper.text()).toContain('Đắc Nhân Tâm')
    expect(wrapper.text()).toContain('Nhà Giả Kim')
    expect(wrapper.text()).toContain('Atomic Habits')
    expect(wrapper.text()).toContain('Sapiens')
    expect(wrapper.text()).toContain('Think Again')
  })

  it('points the primary hero actions to existing routes', () => {
    const wrapper = mount(HomePage, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    })
    const links = wrapper.findAllComponents(RouterLinkStub)
    const discoverLink = links.find((link) => link.text() === 'Khám phá ngay')
    const newBooksLink = links.find((link) => link.text() === 'Sách mới')

    expect(discoverLink?.props('to')).toBe('/books')
    expect(newBooksLink?.props('to')).toBe('/books?sort=new')
  })
})
