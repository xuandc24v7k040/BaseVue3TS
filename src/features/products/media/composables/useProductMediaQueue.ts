import { computed, onBeforeUnmount, reactive } from 'vue'

export type ProductMediaQueueState =
  | 'READY'
  | 'UPLOADING'
  | 'SUCCESS'
  | 'ERROR_RETRYABLE'
  | 'ERROR_INVALID'
  | 'CANCELED'

export type ProductMediaQueueItem = {
  id: string
  file: File
  previewUrl: string | null
  state: ProductMediaQueueState
  error: string | null
}

const allowedTypes = new Map([
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
  ['image/webp', new Set(['webp'])],
])
const MAX_BYTES = 5 * 1024 * 1024
const MAX_CONCURRENCY = 3

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (file.type === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (file.type === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value)
  }
  if (file.type === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  return false
}

export function useProductMediaQueue(options: {
  maxItems: () => number
  upload: (file: File) => Promise<void>
}) {
  const items = reactive<ProductMediaQueueItem[]>([])
  const rejected = reactive<string[]>([])
  const active = computed(() => items.filter((item) => item.state !== 'CANCELED'))
  const pending = computed(() => active.value.some((item) => item.state === 'UPLOADING'))

  function duplicateKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}`
  }

  async function add(files: FileList | File[]): Promise<void> {
    rejected.splice(0)
    const existing = new Set(active.value.map((item) => duplicateKey(item.file)))
    let slots = Math.max(0, options.maxItems() - active.value.length)
    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLocaleLowerCase('vi') ?? ''
      const extensions = allowedTypes.get(file.type)
      let message: string | null = null
      if (!extensions?.has(extension)) message = 'chỉ chấp nhận JPEG, PNG hoặc WebP'
      else if (file.size === 0) message = 'tệp đang rỗng'
      else if (file.size > MAX_BYTES) message = 'vượt quá 5 MB'
      else if (!(await hasValidImageSignature(file))) message = 'nội dung tệp không phải ảnh hợp lệ'
      else if (existing.has(duplicateKey(file))) message = 'đã có trong hàng đợi'
      else if (slots === 0) message = 'vượt quá số ảnh còn lại'
      if (message) {
        rejected.push(`${file.name}: ${message}`)
        continue
      }
      existing.add(duplicateKey(file))
      slots -= 1
      items.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        state: 'READY',
        error: null,
      })
    }
  }

  function revoke(item: ProductMediaQueueItem): void {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    item.previewUrl = null
  }

  function remove(id: string): void {
    const index = items.findIndex((item) => item.id === id)
    if (index < 0 || items[index]!.state === 'UPLOADING') return
    revoke(items[index]!)
    items.splice(index, 1)
  }

  async function uploadItem(item: ProductMediaQueueItem): Promise<void> {
    if (!['READY', 'ERROR_RETRYABLE'].includes(item.state)) return
    item.state = 'UPLOADING'
    item.error = null
    try {
      await options.upload(item.file)
      item.state = 'SUCCESS'
      revoke(item)
    } catch (error) {
      const code = typeof error === 'object' && error !== null
        ? Reflect.get(Reflect.get(error, 'response') ?? {}, 'data')?.code
        : undefined
      if (code === 'PRODUCT_MEDIA_INVALID_FILE') {
        item.state = 'ERROR_INVALID'
        item.error = 'Nội dung tệp không phải ảnh hợp lệ. Vui lòng chọn ảnh khác.'
        revoke(item)
      } else {
        item.state = 'ERROR_RETRYABLE'
        item.error = 'Tải ảnh thất bại. Bạn có thể thử lại.'
      }
    }
  }

  async function uploadAll(): Promise<void> {
    const queue = items.filter((item) => ['READY', 'ERROR_RETRYABLE'].includes(item.state))
    let cursor = 0
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, async () => {
        while (cursor < queue.length) {
          const item = queue[cursor++]
          if (item) await uploadItem(item)
        }
      }),
    )
  }

  function cancelReady(): void {
    for (const item of [...items]) {
      if (item.state === 'READY') remove(item.id)
    }
  }

  function resetSuccess(): void {
    for (let index = items.length - 1; index >= 0; index -= 1) {
      if (items[index]!.state === 'SUCCESS') items.splice(index, 1)
    }
  }

  onBeforeUnmount(() => items.forEach(revoke))

  return { items, rejected, pending, add, remove, uploadItem, uploadAll, cancelReady, resetSuccess }
}
