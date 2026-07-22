import { describe, expect, it } from 'vitest'
import type { ProductAttributeDefinition } from './product-attribute-values'
import { serializeProductAttributeValues } from './product-attribute-values'

const attribute = (
  id: string,
  type: ProductAttributeDefinition['type'],
): ProductAttributeDefinition => ({ id, name: id, code: id.toUpperCase(), type })

describe('serializeProductAttributeValues', () => {
  it('only serializes selected mappings with meaningful values', () => {
    const selected = [attribute('text', 'TEXT'), attribute('date', 'DATE')]
    expect(serializeProductAttributeValues(selected, {
      text: '  Nội dung  ',
      date: '',
      ignored: 'không được gửi',
    })).toEqual([{ attributeId: 'text', value: 'Nội dung' }])
  })

  it('preserves boolean false and numeric zero', () => {
    const selected = [attribute('boolean', 'BOOLEAN'), attribute('number', 'NUMBER')]
    expect(serializeProductAttributeValues(selected, { boolean: false, number: 0 })).toEqual([
      { attributeId: 'boolean', value: false },
      { attributeId: 'number', value: 0 },
    ])
  })

  it('omits undefined, null, blank text and empty arrays', () => {
    const selected = [
      attribute('missing', 'TEXT'),
      attribute('nullish', 'TEXT'),
      attribute('blank', 'TEXT'),
      attribute('multi', 'MULTI_SELECT'),
    ]
    expect(serializeProductAttributeValues(selected, {
      nullish: null,
      blank: '   ',
      multi: [],
    })).toEqual([])
  })

  it('normalizes and de-duplicates multi-select values', () => {
    const selected = [attribute('multi', 'MULTI_SELECT')]
    expect(serializeProductAttributeValues(selected, { multi: ' Một, Hai, Một, ' })).toEqual([
      { attributeId: 'multi', value: ['Một', 'Hai'] },
    ])
  })
})
