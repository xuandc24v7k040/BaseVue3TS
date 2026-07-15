// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>()
  const remove = vi.fn()
  const resize = vi.fn()
  class MapMock {
    addControl = vi.fn()
    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => handlers.set(event, handler))
    resize = resize
    flyTo = vi.fn()
    remove = remove
  }
  class MarkerMock {
    setLngLat() { return this }
    addTo() { return this }
    on() { return this }
    remove() {}
    getLngLat() { return { lat: 10, lng: 105 } }
  }
  class NavigationControlMock {}
  return { handlers, remove, resize, MapMock, MarkerMock, NavigationControlMock }
})

vi.mock('@vietmap/vietmap-gl-js/dist/vietmap-gl', () => ({
  Map: sdk.MapMock,
  Marker: sdk.MarkerMock,
  NavigationControl: sdk.NavigationControlMock,
}))
vi.mock('@/lib/env', () => ({ env: { vietMapTilemapKey: 'tile-key' } }))

import BranchMap from './BranchMap.vue'

describe('BranchMap lifecycle', () => {
  afterEach(() => vi.clearAllMocks())

  it('creates one map, emits clicked coordinates and cleans up on unmount', async () => {
    const wrapper = mount(BranchMap)
    await flushPromises()
    sdk.handlers.get('click')?.({ lngLat: { lat: 10.2, lng: 105.3 } })
    expect(wrapper.emitted('coordinate')?.[0]).toEqual([{ latitude: 10.2, longitude: 105.3 }])
    expect(sdk.resize).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    expect(sdk.remove).toHaveBeenCalledTimes(1)
  })
})
