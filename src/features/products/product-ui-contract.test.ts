import { describe, expect, it } from 'vitest'
import formSource from './pages/ProductFormPage.vue?raw'
import detailSource from './pages/ProductDetailPage.vue?raw'
import optionSource from './components/ProductOptionBuilder.vue?raw'
import variantSource from './components/ProductVariantManager.vue?raw'

describe('Phase 10B UI anti-regression contract', () => {
  it('does not use native master-data selects or the native short-description textarea', () => {
    expect(formSource).not.toMatch(/<select[^>]+id="(?:supplier|publisher)"/)
    expect(formSource).not.toMatch(/<textarea[^>]+id="short-description"/)
    expect(formSource).not.toContain('window.confirm')
    expect(formSource).toContain('<AsyncMasterDataCombobox')
    expect(formSource).toContain('<Textarea')
  })

  it('uses shadcn ScrollArea and mobile branches for audited overflow zones', () => {
    expect(formSource).toContain('<ScrollArea class="h-72"')
    expect(optionSource).toContain('scrollbar-orientation="horizontal"')
    expect(optionSource).toContain('md:hidden')
    expect(variantSource).toContain('scrollbar-orientation="horizontal"')
    expect(variantSource).toContain('Hủy tạo ma trận')
    expect(detailSource).toContain('md:hidden')
  })

  it('keeps destructive controls inside Buttons and avoids @select confirms', () => {
    expect(optionSource).toContain('aria-label="Xóa giá trị"')
    expect(optionSource).not.toMatch(/<Trash2[^>]+@click/)
    expect(optionSource).not.toContain('@select=')
    expect(variantSource).not.toContain('@select=')
  })
})
