import { z } from 'zod'
import type { VietnamProvince, VietnamWard } from '../types'

const PROVINCE_API_BASE_URL = 'https://provinces.open-api.vn/api/v2'
const REQUEST_TIMEOUT_MS = 8_000

const provinceResponseSchema = z.object({
  code: z.number().int(),
  name: z.string(),
  codename: z.string(),
  division_type: z.string(),
})

const wardResponseSchema = provinceResponseSchema.extend({
  province_code: z.number().int(),
})

export class ProvinceApiError extends Error {
  readonly kind: 'network' | 'timeout' | 'invalid-response'

  constructor(
    message: string,
    kind: 'network' | 'timeout' | 'invalid-response',
  ) {
    super(message)
    this.kind = kind
    this.name = 'ProvinceApiError'
  }
}

async function requestJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT_MS)
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })

  try {
    const response = await fetch(`${PROVINCE_API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new ProvinceApiError('Province API trả về lỗi.', 'network')
    return await response.json()
  } catch (error) {
    if (error instanceof ProvinceApiError) throw error
    if (controller.signal.aborted && !signal?.aborted) {
      throw new ProvinceApiError('Province API đã hết thời gian phản hồi.', 'timeout')
    }
    if (signal?.aborted) throw error
    throw new ProvinceApiError('Không thể kết nối Province API.', 'network')
  } finally {
    globalThis.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abort)
  }
}

export async function listVietnamProvinces(signal?: AbortSignal): Promise<VietnamProvince[]> {
  const result = z.array(provinceResponseSchema).safeParse(await requestJson('/p/', signal))
  if (!result.success) throw new ProvinceApiError('Province API trả dữ liệu không hợp lệ.', 'invalid-response')
  return result.data.map((province) => ({
    code: province.code,
    name: province.name,
    codename: province.codename,
    divisionType: province.division_type,
  }))
}

export async function listVietnamWards(
  provinceCode: number,
  signal?: AbortSignal,
): Promise<VietnamWard[]> {
  const params = new URLSearchParams({ province: String(provinceCode) })
  const result = z.array(wardResponseSchema).safeParse(
    await requestJson(`/w/?${params.toString()}`, signal),
  )
  if (!result.success) throw new ProvinceApiError('Province API trả dữ liệu phường/xã không hợp lệ.', 'invalid-response')
  return result.data.map((ward) => ({
    code: ward.code,
    name: ward.name,
    codename: ward.codename,
    divisionType: ward.division_type,
    provinceCode: ward.province_code,
  }))
}
