import { describe, expect, it } from 'vitest'
import selectContentSource from './SelectContent.vue?raw'

describe('SelectContent layering', () => {
  it('uses the existing portal and a layer above sheets', () => {
    expect(selectContentSource).toContain('<SelectPortal>')
    expect(selectContentSource).toContain('position: "popper"')
    expect(selectContentSource).toContain('z-60')
  })
})
