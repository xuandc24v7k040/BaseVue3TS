// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductOptionBuilder from './ProductOptionBuilder.vue'
import ProductVariantManager from './ProductVariantManager.vue'
import AsyncMasterDataCombobox from './AsyncMasterDataCombobox.vue'

const api = vi.hoisted(() => ({
  productOptionsCreate: vi.fn(),
  productOptionsDelete: vi.fn(),
  productOptionsList: vi.fn(),
  productOptionsUpdate: vi.fn(),
  productOptionValuesCreate: vi.fn(),
  productOptionValuesDelete: vi.fn(),
  productOptionValuesUpdate: vi.fn(),
  productVariantsBulkCreate: vi.fn(),
  productVariantsCreate: vi.fn(),
  productVariantsDelete: vi.fn(),
  productVariantsGeneratePreview: vi.fn(),
  productVariantsList: vi.fn(),
  productVariantsSetDefault: vi.fn(),
  productVariantsUpdate: vi.fn(),
}))

vi.mock('../api/product-api', () => api)

const masterDataApi = vi.hoisted(() => ({
  listPublishers: vi.fn(),
  listSuppliers: vi.fn(),
}))

vi.mock('@/features/publishers/api/publisher-api', () => ({ listPublishers: masterDataApi.listPublishers }))
vi.mock('@/features/suppliers/api/supplier-api', () => ({ listSuppliers: masterDataApi.listSuppliers }))

const productId = '01K0000000000000000000000A'
const optionId = '01K0000000000000000000000B'

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

const popoverStubs = {
  Popover: { template: '<div><slot /></div>' },
  PopoverContent: { template: '<div><slot /></div>' },
  PopoverTrigger: { template: '<div><slot /></div>' },
}

function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  const matches = wrapper.findAll('button').filter((button) => button.text().trim() === text)
  expect(matches).toHaveLength(1)
  return matches[0]!
}

describe('Async master-data combobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    masterDataApi.listSuppliers.mockResolvedValue({ data: [{ id: 'supplier-1', name: 'Nhà sách Minh Khai' }] })
    masterDataApi.listPublishers.mockResolvedValue({ data: [] })
  })

  it('selects and clears an option while preserving the selected label', async () => {
    const wrapper = mount(AsyncMasterDataCombobox, {
      props: { id: 'supplier', modelValue: '', kind: 'supplier', label: 'Nhà cung cấp', nullable: true },
      global: { plugins: [[VueQueryPlugin, { queryClient: queryClient() }]], stubs: popoverStubs },
    })
    await flushPromises()

    await buttonByText(wrapper, 'Nhà sách Minh Khai').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['supplier-1']])

    await wrapper.setProps({ modelValue: 'supplier-1' })
    expect(wrapper.get('button[role="combobox"]').text()).toContain('Nhà sách Minh Khai')
    await buttonByText(wrapper, 'Bỏ lựa chọn').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['supplier-1'], ['']])
  })

  it('shows a recoverable error and retries the query', async () => {
    masterDataApi.listPublishers.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: [{ id: 'publisher-1', name: 'NXB Trẻ' }] })
    const wrapper = mount(AsyncMasterDataCombobox, {
      props: { id: 'publisher', modelValue: '', kind: 'publisher', label: 'Nhà xuất bản' },
      global: { plugins: [[VueQueryPlugin, { queryClient: queryClient() }]], stubs: popoverStubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Không thể tải dữ liệu.')

    await buttonByText(wrapper, 'Thử lại').trigger('click')
    await flushPromises()
    expect(masterDataApi.listPublishers).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('NXB Trẻ')
  })
})

describe('Product Option hotfix interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.productOptionsList.mockResolvedValue({
      data: [{
        id: optionId,
        productId,
        name: 'Màu mực',
        code: 'INK_COLOR',
        sortOrder: 0,
        variantUsageCount: 1,
        values: [
          { id: 'value-used', label: 'Xanh', value: 'BLUE', colorCode: '#2563EB', sortOrder: 0, usageCount: 1 },
          { id: 'value-free', label: 'Đỏ', value: 'RED', colorCode: '#DC2626', sortOrder: 1, usageCount: 0 },
        ],
      }],
    })
    api.productOptionValuesCreate.mockResolvedValue({ data: {} })
    api.productOptionValuesDelete.mockResolvedValue({ data: {} })
  })

  it('clicks Add Value for a valid draft and blocks invalid colors before HTTP', async () => {
    const wrapper = mount(ProductOptionBuilder, {
      props: { productId },
      global: { plugins: [[VueQueryPlugin, { queryClient: queryClient() }]], stubs: { teleport: true } },
    })
    await flushPromises()

    await wrapper.get('input[placeholder="Bìa cứng"]').setValue('Đen')
    await wrapper.get('input[placeholder="HARDCOVER"]').setValue('BLACK')
    const newColor = wrapper.findAll('input[placeholder="#2563EB"]').at(-1)!
    await newColor.setValue('#RRGGBB')
    await buttonByText(wrapper, 'Thêm giá trị').trigger('click')
    expect(api.productOptionValuesCreate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Mã màu phải có dạng #RRGGBB')

    await newColor.setValue('#111827')
    await buttonByText(wrapper, 'Thêm giá trị').trigger('click')
    await flushPromises()
    expect(api.productOptionValuesCreate).toHaveBeenCalledTimes(1)
    expect(api.productOptionValuesCreate).toHaveBeenCalledWith(productId, optionId, expect.objectContaining({ colorCode: '#111827' }))
  })

  it('shows blocked delete semantics and never exposes an enabled confirm action', async () => {
    const wrapper = mount(ProductOptionBuilder, {
      props: { productId },
      global: {
        plugins: [[VueQueryPlugin, { queryClient: queryClient() }]],
        stubs: {
          MasterDataDeleteDialog: {
            props: ['open', 'blockedReason'],
            template: '<div v-if="open" data-testid="delete-dialog">{{ blockedReason }}</div>',
          },
        },
      },
    })
    await flushPromises()
    const deleteButtons = wrapper.findAll('button[aria-label="Xóa giá trị"]')
    expect(deleteButtons).toHaveLength(2)
    await deleteButtons[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="delete-dialog"]').text()).toContain('Giá trị đang được 1 biến thể sử dụng.')
    expect(api.productOptionValuesDelete).not.toHaveBeenCalled()
  })
})

describe('Product Variant matrix state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.productOptionsList.mockResolvedValue({ data: [{ id: optionId, productId, name: 'Màu', code: 'COLOR', sortOrder: 0, variantUsageCount: 0, values: [{ id: 'value-blue', label: 'Xanh', value: 'BLUE', colorCode: '#2563EB', sortOrder: 0, usageCount: 0 }] }] })
    api.productVariantsList.mockResolvedValue({ data: [] })
    api.productVariantsGeneratePreview.mockResolvedValue({ data: { combinations: [{ combinationKey: 'COLOR=BLUE', label: 'Màu: Xanh', optionValueIds: ['value-blue'], exists: false }] } })
  })

  it('opens, cancels and reopens preview without calling a mutation', async () => {
    const wrapper = mount(ProductVariantManager, {
      props: { productId },
      global: { plugins: [[VueQueryPlugin, { queryClient: queryClient() }]] },
    })
    await flushPromises()

    await buttonByText(wrapper, 'Tạo ma trận').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Ma trận dự kiến (1)')
    expect(wrapper.text()).toContain('Hủy tạo ma trận')

    await buttonByText(wrapper, 'Hủy tạo ma trận').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Ma trận dự kiến')
    expect(api.productVariantsBulkCreate).not.toHaveBeenCalled()

    await buttonByText(wrapper, 'Tạo ma trận').trigger('click')
    await flushPromises()
    expect(api.productVariantsGeneratePreview).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Ma trận dự kiến (1)')
  })
})
