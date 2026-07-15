import { afterEach, describe, expect, it, vi } from 'vitest'
import { geolocationMessage, getBrowserLocation } from './use-browser-geolocation'

const position = { coords: { latitude: 10.1, longitude: 105.2 } } as GeolocationPosition

function positionError(code: number): GeolocationPositionError {
  return { code, message: 'failed', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }
}

describe('browser geolocation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('resolves on the high-accuracy attempt after permission preflight', async () => {
    const getCurrentPosition = vi.fn((
      success: PositionCallback,
      _failure?: PositionErrorCallback | null,
      _options?: PositionOptions,
    ) => success(position))
    const query = vi.fn().mockResolvedValue({ state: 'granted' })
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition }, permissions: { query } })

    await expect(getBrowserLocation()).resolves.toEqual({ latitude: 10.1, longitude: 105.2 })
    expect(query).toHaveBeenCalledWith({ name: 'geolocation' })
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 30_000,
    })
  })

  it.each([2, 3])('falls back once after recoverable error code %s', async (code) => {
    const getCurrentPosition = vi.fn((
      success: PositionCallback,
      failure: PositionErrorCallback,
      _options?: PositionOptions,
    ) => {
      if (getCurrentPosition.mock.calls.length === 1) failure(positionError(code))
      else success(position)
    })
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })

    await expect(getBrowserLocation()).resolves.toEqual({ latitude: 10.1, longitude: 105.2 })
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
    expect(getCurrentPosition.mock.calls[1]?.[2]).toEqual({
      enableHighAccuracy: false,
      timeout: 20_000,
      maximumAge: 300_000,
    })
  })

  it('writes structured DEV diagnostics without coordinates or addresses', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined)
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined)
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position))
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition },
      permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    })

    await getBrowserLocation()

    const diagnostic = info.mock.calls[0]?.[0] as Record<string, unknown>
    expect(diagnostic).toMatchObject({
      supported: true,
      secureContext: true,
      permissionState: 'granted',
      attempt: 1,
      highAccuracy: true,
      timeoutMs: 12_000,
      maximumAgeMs: 30_000,
    })
    expect(diagnostic).not.toHaveProperty('latitude')
    expect(diagnostic).not.toHaveProperty('longitude')
    expect(diagnostic).not.toHaveProperty('address')
  })

  it('does not write detailed diagnostics when DEV is disabled', async () => {
    vi.stubEnv('DEV', false)
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position))
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })

    await getBrowserLocation()

    expect(info).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('does not call geolocation when permission is denied', async () => {
    const getCurrentPosition = vi.fn()
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition },
      permissions: { query: vi.fn().mockResolvedValue({ state: 'denied' }) },
    })

    await expect(getBrowserLocation()).rejects.toBe('permission')
    expect(getCurrentPosition).not.toHaveBeenCalled()
  })

  it('shares one active flow across double clicks', async () => {
    let resolvePosition: PositionCallback | undefined
    const getCurrentPosition = vi.fn((success: PositionCallback) => { resolvePosition = success })
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })

    const first = getBrowserLocation()
    const second = getBrowserLocation()
    expect(first).toBe(second)
    await Promise.resolve()
    resolvePosition?.(position)
    await expect(first).resolves.toEqual({ latitude: 10.1, longitude: 105.2 })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('ignores a late callback after cancellation', async () => {
    let resolvePosition: PositionCallback | undefined
    const getCurrentPosition = vi.fn((success: PositionCallback) => { resolvePosition = success })
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } })
    const controller = new AbortController()
    const request = getBrowserLocation({ signal: controller.signal })
    await Promise.resolve()
    controller.abort()
    resolvePosition?.(position)
    await expect(request).rejects.toBe('aborted')
  })

  it('uses actionable Vietnamese failure messages', () => {
    expect(geolocationMessage('permission')).toContain('bật quyền vị trí')
    expect(geolocationMessage('timeout')).toContain('thời gian cho phép')
    expect(geolocationMessage('unavailable')).toContain('chọn trực tiếp trên bản đồ')
  })
})
