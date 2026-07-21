// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProductMediaQueue } from './useProductMediaQueue'

describe('useProductMediaQueue', () => {
  const createObjectURL = vi.fn((file: File) => `blob:${file.name}`)
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
  })

  function createQueue(upload: (file: File) => Promise<void> = vi.fn(async () => undefined), maxItems = 12) {
    const Component = defineComponent({
      setup() {
        return { queue: useProductMediaQueue({ maxItems: () => maxItems, upload }) }
      },
      template: '<div />',
    })
    const wrapper = mount(Component)
    return {
      wrapper,
      queue: (wrapper.vm as unknown as {
        queue: ReturnType<typeof useProductMediaQueue>
      }).queue,
      upload,
    }
  }

  it('does not create a preview or queue item for an invalid file', async () => {
    const { queue } = createQueue()
    await queue.add([new File(['text'], 'fake.jpg', { type: 'image/jpeg' })])
    expect(queue.items).toHaveLength(0)
    expect(queue.rejected[0]).toContain('fake.jpg')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('skips duplicates and files beyond the remaining slots', async () => {
    const { queue } = createQueue(undefined, 1)
    const webp = 'RIFFxxxxWEBP'
    const first = new File([webp], 'one.webp', { type: 'image/webp', lastModified: 1 })
    const duplicate = new File([webp], 'one.webp', { type: 'image/webp', lastModified: 1 })
    const overflow = new File([webp], 'two.webp', { type: 'image/webp', lastModified: 2 })
    await queue.add([first, duplicate, overflow])
    expect(queue.items).toHaveLength(1)
    expect(queue.rejected).toHaveLength(2)
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('uploads no more than three items concurrently and revokes successful previews', async () => {
    let active = 0
    let maximum = 0
    const upload = vi.fn(async () => {
      active += 1
      maximum = Math.max(maximum, active)
      await Promise.resolve()
      active -= 1
    })
    const { queue } = createQueue(upload)
    await queue.add(Array.from({ length: 5 }, (_, index) =>
      new File(['RIFFxxxxWEBP'], `${index}.webp`, { type: 'image/webp', lastModified: index }),
    ))
    await queue.uploadAll()
    expect(maximum).toBeLessThanOrEqual(3)
    expect(upload).toHaveBeenCalledTimes(5)
    expect(queue.items.every((item) => item.state === 'SUCCESS')).toBe(true)
    expect(revokeObjectURL).toHaveBeenCalledTimes(5)
  })

  it('keeps the preview and exposes retry for a transient failure', async () => {
    const upload = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)
    const { queue } = createQueue(upload)
    await queue.add([new File(['RIFFxxxxWEBP'], 'retry.webp', { type: 'image/webp' })])
    const item = queue.items[0]!
    await queue.uploadItem(item)
    expect(item.state).toBe('ERROR_RETRYABLE')
    expect(item.previewUrl).toBe('blob:retry.webp')
    await queue.uploadItem(item)
    expect(item.state).toBe('SUCCESS')
    expect(item.previewUrl).toBeNull()
  })
})
