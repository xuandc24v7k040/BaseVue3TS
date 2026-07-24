// @vitest-environment happy-dom

import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { listVietnamProvinces, listVietnamWards } from '../api/province-api'
import { reverseBranchLocation } from '../api/branch-api'
import BranchLocationPickerDialog from './BranchLocationPickerDialog.vue'

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))
vi.mock('../api/branch-api', () => ({
  autocompleteBranchLocation: vi.fn(),
  resolveBranchPlace: vi.fn(),
  reverseBranchLocation: vi.fn(),
}))
vi.mock('../api/province-api', () => ({
  listVietnamProvinces: vi.fn(),
  listVietnamWards: vi.fn(),
}))

const WrapperStub = defineComponent({ template: '<div><slot /></div>' })
const BranchMapStub = defineComponent({
  name: 'BranchMap',
  emits: ['coordinate', 'error'],
  setup(_, { expose }) {
    expose({ flyTo: vi.fn(), resize: vi.fn() })
    return {}
  },
  template: '<div data-testid="map" />',
})

function mountPicker() {
  return mount(BranchLocationPickerDialog, {
    props: { open: false, initialLocation: null },
    global: {
      stubs: {
        Dialog: WrapperStub,
        DialogContent: WrapperStub,
        DialogDescription: WrapperStub,
        DialogFooter: WrapperStub,
        DialogHeader: WrapperStub,
        DialogTitle: WrapperStub,
        ScrollArea: WrapperStub,
        BranchMap: BranchMapStub,
      },
    },
  })
}

const canTho = {
  latitude: 10.0452,
  longitude: 105.7469,
  province: 'Thành phố Cần Thơ',
  ward: 'Phường Ninh Kiều',
  address: 'Ninh Kiều',
  displayAddress: 'Ninh Kiều, Cần Thơ',
}

describe('BranchLocationPickerDialog validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reverseBranchLocation).mockReset()
    vi.mocked(listVietnamProvinces).mockResolvedValue([
      { code: 92, name: 'Thành phố Cần Thơ', codename: 'can_tho', divisionType: 'thành phố trung ương' },
    ])
    vi.mocked(listVietnamWards).mockResolvedValue([
      { code: 9201, name: 'Phường Ninh Kiều', codename: 'ninh_kieu', divisionType: 'phường', provinceCode: 92 },
    ])
  })

  it('enables confirm only after reverse and official catalog verification', async () => {
    vi.mocked(reverseBranchLocation).mockResolvedValue({ data: canTho } as never)
    const wrapper = mountPicker()
    await wrapper.setProps({ open: true })
    await nextTick()

    wrapper.getComponent(BranchMapStub).vm.$emit('coordinate', {
      latitude: canTho.latitude,
      longitude: canTho.longitude,
    })
    await flushPromises()

    const confirm = wrapper.findAll('button').find((button) => button.text().includes('Xác nhận vị trí'))
    expect(confirm?.attributes('disabled')).toBeUndefined()
  })

  it('blocks 0,0 before reverse and keeps confirm disabled', async () => {
    const wrapper = mountPicker()
    await wrapper.setProps({ open: true })
    wrapper.getComponent(BranchMapStub).vm.$emit('coordinate', { latitude: 0, longitude: 0 })
    await flushPromises()

    expect(reverseBranchLocation).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      'Tọa độ 0, 0 không phải vị trí hợp lệ của chi nhánh tại Việt Nam.',
    )
    const confirm = wrapper.findAll('button').find((button) => button.text().includes('Xác nhận vị trí'))
    expect(confirm?.attributes('disabled')).toBeDefined()
  })

  it('distinguishes outside results from reverse network failures', async () => {
    vi.mocked(reverseBranchLocation).mockResolvedValue({
      data: {
        ...canTho,
        countryCode: 'KH',
        province: 'Phnom Penh',
        ward: 'Chamkar Mon',
      },
    } as never)
    const wrapper = mountPicker()
    await wrapper.setProps({ open: true })
    await flushPromises()
    const callsBeforeCoordinate = vi.mocked(reverseBranchLocation).mock.calls.length
    wrapper.getComponent(BranchMapStub).vm.$emit('coordinate', { latitude: 11.5564, longitude: 104.9282 })
    await flushPromises()
    expect(reverseBranchLocation).toHaveBeenCalledTimes(callsBeforeCoordinate + 1)
    expect(listVietnamProvinces).toHaveBeenCalledOnce()
    expect(listVietnamWards).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('nằm ngoài lãnh thổ Việt Nam')

    vi.mocked(reverseBranchLocation).mockRejectedValueOnce(new Error('network'))
    wrapper.getComponent(BranchMapStub).vm.$emit('coordinate', { latitude: 10.1, longitude: 105.7 })
    await flushPromises()
    expect(wrapper.text()).toContain('Không thể xác minh tọa độ vào lúc này')
  })
})
