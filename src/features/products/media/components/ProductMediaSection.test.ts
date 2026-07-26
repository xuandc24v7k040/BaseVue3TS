// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductMediaResponseDto } from '@/api/generated/models'
import ProductMediaSection from './ProductMediaSection.vue'

const mediaApi = vi.hoisted(() => ({
  productMediaDelete: vi.fn(),
  productMediaList: vi.fn(),
  productMediaReorder: vi.fn(),
  productMediaSetPrimary: vi.fn(),
  productMediaUpdate: vi.fn(),
  productMediaUpload: vi.fn(),
}))

const productApi = vi.hoisted(() => ({ productVariantsList: vi.fn() }))
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }))

vi.mock('../api/product-media-api', () => mediaApi)
vi.mock('../../api/product-api', () => productApi)
vi.mock('vue-sonner', () => ({ toast: notifications }))
vi.mock('vue-draggable-plus', () => ({
  VueDraggable: defineComponent({
    name: 'VueDraggable',
    props: { modelValue: { type: Array, required: true } },
    emits: ['update:modelValue', 'start', 'end'],
    template: '<div data-testid="draggable"><slot /></div>',
  }),
}))

const productId = '01K0000000000000000000000A'
const first = mediaItem('01K0000000000000000000000B', true, 0)
const second = mediaItem('01K0000000000000000000000C', false, 1)

function mediaItem(id: string, isPrimary: boolean, sortOrder: number): ProductMediaResponseDto {
  return {
    id,
    productId,
    variantId: null,
    type: 'IMAGE',
    url: `https://media.example/${id}.webp`,
    altText: null,
    sortOrder,
    isPrimary,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
  }
}

function queryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

function renderSection() {
  return mount(ProductMediaSection, {
    props: { productId },
    global: {
      plugins: [[VueQueryPlugin, { queryClient: queryClient() }]],
      stubs: {
        TooltipProvider: { template: '<div><slot /></div>' },
        Tooltip: { template: '<div><slot /></div>' },
        TooltipTrigger: { template: '<div><slot /></div>' },
        TooltipContent: { template: '<div><slot /></div>' },
        teleport: true,
      },
    },
  })
}

function cardIds(wrapper: ReturnType<typeof renderSection>): string[] {
  return wrapper.findAll('[data-media-id]').map((card) => String(card.attributes('data-media-id')))
}

async function reorder(wrapper: ReturnType<typeof renderSection>, nextOrder: ProductMediaResponseDto[]): Promise<void> {
  const draggable = wrapper.getComponent({ name: 'VueDraggable' })
  draggable.vm.$emit('start', {})
  draggable.vm.$emit('update:modelValue', nextOrder)
  await nextTick()
  draggable.vm.$emit('end', {})
  await flushPromises()
}

function queuedFiles(count: number): File[] {
  return Array.from({ length: count }, (_, index) =>
    new File(
      ['RIFFxxxxWEBP'],
      `${index}-${'ten-file-rat-dai-'.repeat(8)}.webp`,
      { type: 'image/webp', lastModified: index },
    ),
  )
}

async function selectQueuedFiles(
  wrapper: ReturnType<typeof renderSection>,
  count: number,
): Promise<void> {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: queuedFiles(count),
  })
  await input.trigger('change')
  await flushPromises()
}

describe('Product Media final hotfix interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    })
    productApi.productVariantsList.mockResolvedValue({ data: [] })
    mediaApi.productMediaList.mockResolvedValue({ data: [first, second] })
    mediaApi.productMediaReorder.mockResolvedValue({ data: [second, first] })
    mediaApi.productMediaSetPrimary.mockResolvedValue({ data: { ...second, isPrimary: true } })
  })

  it('renders compact filled/outline stars and skips the current primary request', async () => {
    const wrapper = renderSection()
    await flushPromises()

    const primary = wrapper.get('button[aria-label="Ảnh đại diện"]')
    const secondary = wrapper.get('button[aria-label="Đặt làm ảnh đại diện"]')
    expect(primary.attributes('aria-pressed')).toBe('true')
    expect(secondary.attributes('aria-pressed')).toBe('false')
    expect(wrapper.text()).not.toContain('Đặt đại diện')

    await primary.trigger('click')
    expect(mediaApi.productMediaSetPrimary).not.toHaveBeenCalled()
  })

  it('sets a non-primary image with per-item loading and reports failure without losing the old primary', async () => {
    let rejectRequest!: (reason: unknown) => void
    mediaApi.productMediaSetPrimary.mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject }))
    const wrapper = renderSection()
    await flushPromises()

    const secondary = wrapper.get('button[aria-label="Đặt làm ảnh đại diện"]')
    await secondary.trigger('click')
    expect(mediaApi.productMediaSetPrimary).toHaveBeenCalledWith(productId, second.id)
    expect(secondary.attributes('aria-busy')).toBe('true')

    rejectRequest(new Error('offline'))
    await flushPromises()
    expect(wrapper.get('button[aria-label="Ảnh đại diện"]').attributes('aria-pressed')).toBe('true')
    expect(notifications.error).toHaveBeenCalledTimes(1)
  })

  it('persists one general-gallery request after drop and keeps the primary id unchanged', async () => {
    const wrapper = renderSection()
    await flushPromises()

    await reorder(wrapper, [second, first])

    expect(mediaApi.productMediaReorder).toHaveBeenCalledTimes(1)
    expect(mediaApi.productMediaReorder).toHaveBeenCalledWith(productId, {
      variantId: null,
      orderedMediaIds: [second.id, first.id],
    })
    expect(first.isPrimary).toBe(true)
  })

  it('persists reorder inside the selected variant gallery', async () => {
    productApi.productVariantsList.mockResolvedValueOnce({
      data: [{ id: 'variant-1', name: 'Bìa mềm', sku: 'BOOK-SOFT' }],
    })
    const wrapper = renderSection()
    await flushPromises()

    const gallerySelect = wrapper.getComponent({ name: 'Select' })
    gallerySelect.vm.$emit('update:modelValue', 'variant-1')
    await flushPromises()
    await reorder(wrapper, [second, first])

    expect(mediaApi.productMediaReorder).toHaveBeenCalledWith(productId, {
      variantId: 'variant-1',
      orderedMediaIds: [second.id, first.id],
    })
  })

  it('does not request an unchanged order and rolls the cards back when persistence fails', async () => {
    const wrapper = renderSection()
    await flushPromises()

    await reorder(wrapper, [first, second])
    expect(mediaApi.productMediaReorder).not.toHaveBeenCalled()

    mediaApi.productMediaReorder.mockRejectedValueOnce(new Error('offline'))
    await reorder(wrapper, [second, first])
    expect(cardIds(wrapper)).toEqual([first.id, second.id])
    expect(notifications.error).toHaveBeenCalledTimes(1)
  })

  it('uses a focusable drag handle and does not expose legacy arrow controls', async () => {
    const wrapper = renderSection()
    await flushPromises()

    expect(wrapper.findAll('button[aria-label="Kéo để sắp xếp ảnh"]')).toHaveLength(2)
    expect(wrapper.find('button[aria-label="Di chuyển ảnh sang trái"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Di chuyển ảnh sang phải"]').exists()).toBe(false)
  })

  it.each([1, 4, 8, 12])('keeps %i queued files inside the bounded ScrollArea', async (count) => {
    mediaApi.productMediaList.mockResolvedValue({ data: [] })
    const wrapper = renderSection()
    await flushPromises()
    await selectQueuedFiles(wrapper, count)

    const scrollArea = wrapper.get('[data-slot="scroll-area"]')
    expect(scrollArea.classes()).toContain('h-[min(18rem,45vh)]')
    expect(scrollArea.findAll('article')).toHaveLength(count)
    expect(scrollArea.find('.truncate[title]').exists()).toBe(true)
    expect(wrapper.get('button').text()).not.toBe('')
  })

  it('keeps queue actions working without touching product option state', async () => {
    mediaApi.productMediaList.mockResolvedValue({ data: [] })
    mediaApi.productMediaUpload.mockResolvedValue({ data: {} })
    const wrapper = renderSection()
    await flushPromises()
    await selectQueuedFiles(wrapper, 4)

    const before = wrapper.get('[data-slot="scroll-area"]')
    expect(before.findAll('article')).toHaveLength(4)
    await before.findAll('button').find((button) => button.text().includes('Bỏ'))?.trigger('click')
    expect(wrapper.get('[data-slot="scroll-area"]').findAll('article')).toHaveLength(3)

    await wrapper.findAll('button').find((button) => button.text().includes('Tải lên tất cả'))?.trigger('click')
    await flushPromises()
    expect(mediaApi.productMediaUpload).toHaveBeenCalledTimes(3)
    expect(wrapper.find('[data-slot="scroll-area"]').exists()).toBe(false)
  })
})
