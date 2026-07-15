// @vitest-environment happy-dom

import { defineComponent, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { updateBranch } from '../api/branch-api'
import BranchFormDialog from './BranchFormDialog.vue'

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('../api/branch-api', () => ({ createBranch: vi.fn(), updateBranch: vi.fn() }))
vi.mock('../composables/use-vietnam-administrative-units', () => ({
  useVietnamProvinces: () => ({
    data: ref([]),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  }),
  useVietnamWards: () => ({
    data: ref([]),
    isPending: ref(false),
    isError: ref(false),
    refetch: vi.fn(),
  }),
}))

const branch = {
  id: '01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T',
  code: 'ct-nk',
  name: 'Bookora Ninh Kiều',
  address: '12 Đường 30 tháng 4',
  phone: '02923888888',
  province: 'Thành phố Cần Thơ',
  ward: 'Phường Ninh Kiều',
  latitude: 10.0452,
  longitude: 105.7469,
  isActive: true,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
}

const WrapperStub = defineComponent({ template: '<div><slot /></div>' })
const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})
const PickerStub = defineComponent({
  name: 'BranchLocationPickerDialog',
  emits: ['confirm', 'update:open'],
  template: '<div data-testid="picker" />',
})

function mountDialog(mode: 'create' | 'update', open = true) {
  return mount(BranchFormDialog, {
    props: { open, mode, branch: mode === 'update' ? branch : null },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: new QueryClient() }]],
      stubs: {
        Dialog: WrapperStub,
        DialogContent: WrapperStub,
        DialogDescription: WrapperStub,
        DialogFooter: WrapperStub,
        DialogHeader: WrapperStub,
        DialogTitle: WrapperStub,
        ScrollArea: WrapperStub,
        BranchAdministrativeUnitCombobox: WrapperStub,
        BranchLocationPickerDialog: PickerStub,
        Button: ButtonStub,
      },
    },
  })
}

describe('BranchFormDialog hotfix behavior', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clears required errors on input without requiring a map location', async () => {
    const wrapper = mountDialog('create')
    await (wrapper.vm as unknown as { submit: () => Promise<void> }).submit()
    await flushPromises()
    expect(toast.error).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Mã chi nhánh không được để trống')
    expect(wrapper.text()).not.toContain('Vui lòng chọn vị trí chi nhánh trên bản đồ.')

    await wrapper.get('#branch-code').setValue('CT-01')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Mã chi nhánh không được để trống')
  })

  it('keeps update code read-only and preserves candidate semantics', async () => {
    const wrapper = mountDialog('update', false)
    await wrapper.setProps({ open: true })
    await nextTick()
    expect(wrapper.get('#branch-code').attributes('readonly')).toBeDefined()
    expect((wrapper.get('#branch-address').element as HTMLInputElement).value).toBe(branch.address)

    const candidate = {
      latitude: 10.7,
      longitude: 106.6,
      province: 'Thành phố Hồ Chí Minh',
      ward: 'Phường Bến Thành',
      address: '1 Lê Lợi',
      displayAddress: '1 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh',
    }
    wrapper.getComponent(PickerStub).vm.$emit('confirm', candidate)
    await nextTick()
    expect((wrapper.get('#branch-address').element as HTMLInputElement).value).toBe(branch.address)
    expect(wrapper.text()).toContain('Đã phát hiện địa chỉ từ bản đồ')

    const applyButton = wrapper.findAll('button').find((button) => button.text().includes('Áp dụng địa chỉ'))
    await applyButton?.trigger('click')
    await nextTick()
    expect((wrapper.get('#branch-address').element as HTMLInputElement).value).toBe('1 Lê Lợi')
  })

  it('keeps the update dialog open and preserves values when the backend rejects a status change', async () => {
    vi.mocked(updateBranch).mockRejectedValueOnce(new Error('active assignment conflict'))
    const wrapper = mountDialog('update', false)
    await wrapper.setProps({ open: true })
    await nextTick()

    await (wrapper.vm as unknown as { submit: () => Promise<void> }).submit()
    await flushPromises()

    expect(updateBranch).toHaveBeenCalledOnce()
    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect((wrapper.get('#branch-name').element as HTMLInputElement).value).toBe(branch.name)
    expect(toast.error).toHaveBeenCalledWith('Không thể lưu chi nhánh. Vui lòng thử lại.')
  })
})
