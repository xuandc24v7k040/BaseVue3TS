import { describe, expect, it, vi } from 'vitest'
import { reportDuplicateDataTableRowId } from './utils'

describe('reportDuplicateDataTableRowId', () => {
  it('throws in DEV when row selection is enabled', () => {
    expect(() =>
      reportDuplicateDataTableRowId('123', { enableRowSelection: true }, true),
    ).toThrow(
      '[DataTable] Duplicate row id "123" detected while row selection or expansion is enabled.',
    )
  })

  it('throws in DEV when row expansion is enabled', () => {
    expect(() =>
      reportDuplicateDataTableRowId('123', { enableExpanding: true }, true),
    ).toThrow(/Row ids must be unique and stable across pages/)
  })

  it('warns without throwing in DEV when selection and expansion are disabled', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(() => reportDuplicateDataTableRowId('123', {}, true)).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      '[DataTable] Duplicate row id "123" detected. Selection/expansion may behave incorrectly.',
    )
  })
})
