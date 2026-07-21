// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest'
import namedForm from './components/NamedMasterDataFormDialog.vue?raw'
import supplierForm from '@/features/suppliers/components/SupplierFormDialog.vue?raw'
import attributeForm from '@/features/product-attributes/components/ProductAttributeFormDialog.vue?raw'
import { focusFirstInvalidField } from './utils/focus-first-invalid-field'

const forms = [
  ['publisher/author', namedForm],
  ['supplier', supplierForm],
  ['product attribute', attributeForm],
] as const

describe('Phase 10A form and dialog contract', () => {
  it.each(forms)('%s keeps fixed actions around a ScrollArea body', (_, source) => {
    expect(source).toContain('grid-rows-[auto_minmax(0,1fr)_auto]')
    expect(source).toContain('<DialogHeader')
    expect(source).toContain('<ScrollArea')
    expect(source).toContain('<DialogFooter')
  })

  it.each(forms)('%s blocks double submit and focuses invalid fields', (_, source) => {
    expect(source).toContain('if (pending.value) return')
    expect(source).toContain('focusFirstInvalidField')
    expect(source).toContain('aria-invalid')
    expect(source).not.toContain('errors.root =')
  })

  it('scrolls and focuses the first invalid field', async () => {
    document.body.innerHTML = `
      <form id="phase10-form">
        <input id="valid" aria-invalid="false" />
        <input id="invalid" aria-invalid="true" />
      </form>
    `
    const invalid = document.getElementById('invalid') as HTMLInputElement
    invalid.scrollIntoView = vi.fn()

    await focusFirstInvalidField('phase10-form')

    expect(document.activeElement).toBe(invalid)
    expect(invalid.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })
})
