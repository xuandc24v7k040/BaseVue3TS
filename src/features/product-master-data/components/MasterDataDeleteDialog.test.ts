// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import MasterDataDeleteDialog from './MasterDataDeleteDialog.vue'

describe('MasterDataDeleteDialog contract', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('emits confirm when the destructive button is clicked', async () => {
    const wrapper = mount(MasterDataDeleteDialog, {
      attachTo: document.body,
      props: {
        open: true,
        name: 'Nhà cung cấp kiểm thử',
        title: 'Xóa nhà cung cấp?',
        description: 'Hành động này không thể hoàn tác.',
      },
    })

    await nextTick()
    const confirmButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Xóa',
    )

    expect(confirmButton).toBeDefined()
    confirmButton!.click()
    await nextTick()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not emit confirm while a deletion is pending', async () => {
    const wrapper = mount(MasterDataDeleteDialog, {
      attachTo: document.body,
      props: {
        open: true,
        name: 'Nhà cung cấp kiểm thử',
        title: 'Xóa nhà cung cấp?',
        description: 'Hành động này không thể hoàn tác.',
        pending: true,
      },
    })

    await nextTick()
    const confirmButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Xóa',
    )

    expect(confirmButton?.disabled).toBe(true)
    confirmButton!.click()
    await nextTick()

    expect(wrapper.emitted('confirm')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows only a close action when deletion is blocked', async () => {
    const wrapper = mount(MasterDataDeleteDialog, {
      attachTo: document.body,
      props: {
        open: true,
        name: 'Giá trị đang dùng',
        title: 'Không thể xóa',
        description: 'Xác nhận xóa.',
        blockedReason: 'Giá trị đang được một biến thể sử dụng.',
      },
    })

    await nextTick()
    const buttons = [...document.querySelectorAll('button')]
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog?.classList.contains('pointer-events-auto')).toBe(true)
    expect(buttons.some((button) => button.textContent?.trim() === 'Xóa')).toBe(false)
    expect(buttons.some((button) => button.textContent?.trim() === 'Đóng')).toBe(true)
    expect(document.body.textContent).toContain('Giá trị đang được một biến thể sử dụng.')
    expect(wrapper.emitted('confirm')).toBeUndefined()

    const closeButton = buttons.find((button) => button.textContent?.trim() === 'Đóng')
    closeButton!.click()
    await nextTick()
    expect(wrapper.emitted('update:open')).toContainEqual([false])
    wrapper.unmount()
  })
})
