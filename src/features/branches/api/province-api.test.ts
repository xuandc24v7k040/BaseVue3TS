import { afterEach, describe, expect, it, vi } from 'vitest'
import { listVietnamProvinces, listVietnamWards, ProvinceApiError } from './province-api'

describe('Province Open API v2 client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps official province and ward response fields', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        code: 92,
        name: 'Thành phố Cần Thơ',
        codename: 'can_tho',
        division_type: 'thành phố trung ương',
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        code: 31117,
        name: 'Phường Ninh Kiều',
        codename: 'phuong_ninh_kieu',
        division_type: 'phường',
        province_code: 92,
      }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listVietnamProvinces()).resolves.toEqual([{
      code: 92,
      name: 'Thành phố Cần Thơ',
      codename: 'can_tho',
      divisionType: 'thành phố trung ương',
    }])
    await expect(listVietnamWards(92)).resolves.toEqual([{
      code: 31117,
      name: 'Phường Ninh Kiều',
      codename: 'phuong_ninh_kieu',
      divisionType: 'phường',
      provinceCode: 92,
    }])
    expect(String(fetchMock.mock.calls[0]?.[0]).endsWith('/api/v2/p/')).toBe(true)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/v2/w/?province=92')
  })

  it('rejects invalid external responses without clearing form state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ code: 'invalid' }]), { status: 200 }),
    ))
    await expect(listVietnamProvinces()).rejects.toBeInstanceOf(ProvinceApiError)
  })
})
