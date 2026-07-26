import { describe, expect, it } from 'vitest'
import administrativeComboboxSource from './BranchAdministrativeUnitCombobox.vue?raw'
import branchFormDialogSource from './BranchFormDialog.vue?raw'
import branchLocationPickerSource from './BranchLocationPickerDialog.vue?raw'
import branchStatusSource from './BranchStatusBadge.vue?raw'
import branchDetailMapSource from './BranchDetailMap.vue?raw'
import branchDetailPageSource from '../pages/BranchDetailPage.vue?raw'
import branchListPageSource from '../pages/BranchListPage.vue?raw'
import popoverContentSource from '../../../components/ui/popover/PopoverContent.vue?raw'

function source(fileName: string): string {
  const sources: Record<string, string> = {
    'BranchAdministrativeUnitCombobox.vue': administrativeComboboxSource,
    'BranchFormDialog.vue': branchFormDialogSource,
    'BranchLocationPickerDialog.vue': branchLocationPickerSource,
    'BranchStatusBadge.vue': branchStatusSource,
    'BranchDetailMap.vue': branchDetailMapSource,
    '../pages/BranchDetailPage.vue': branchDetailPageSource,
    '../pages/BranchListPage.vue': branchListPageSource,
    '../../../components/ui/popover/PopoverContent.vue': popoverContentSource,
  }
  return sources[fileName] ?? ''
}

describe('Phase 8A UI hotfix invariants', () => {
  it.each(['BranchFormDialog.vue', 'BranchLocationPickerDialog.vue'])(
    'keeps one scroll area between the header and footer in %s',
    (fileName) => {
      const component = source(fileName)
      const headerIndex = component.indexOf('<DialogHeader')
      const bodyIndex = component.indexOf('flex h-0 min-h-0 flex-1 flex-col overflow-hidden')
      const scrollIndex = component.indexOf('<ScrollArea type="auto" class="h-full min-h-0 w-full flex-1 overflow-hidden">')
      const footerIndex = component.indexOf('<DialogFooter')

      expect(component).toContain('flex h-[min(')
      expect(component).toContain('max-h-[calc(100dvh-2rem)]')
      expect(component).toContain('flex-col overflow-hidden')
      expect(component).toContain('flex h-0 min-h-0 flex-1 flex-col overflow-hidden')
      expect(component).toContain('[&_[data-slot=scroll-area-thumb]]:bg-muted-foreground/45')
      expect(component).toContain('type="auto"')
      expect(headerIndex).toBeGreaterThan(-1)
      expect(bodyIndex).toBeGreaterThan(headerIndex)
      expect(scrollIndex).toBeGreaterThan(bodyIndex)
      expect(footerIndex).toBeGreaterThan(scrollIndex)
      expect(component.slice(footerIndex, component.indexOf('</DialogFooter>'))).not.toMatch(/\b(?:absolute|fixed)\b/)
      expect(component.match(/<ScrollArea\b/g)).toHaveLength(1)
    },
  )

  it('orders the location picker controls and keeps its toolbar right-aligned', () => {
    const component = source('BranchLocationPickerDialog.vue')
    const searchIndex = component.indexOf('placeholder="Tìm địa điểm')
    const toolbarIndex = component.indexOf('flex flex-wrap justify-end gap-2')
    const mapIndex = component.indexOf('<BranchMap')
    const coordinatesIndex = component.indexOf('for="branch-latitude"')
    const previewIndex = component.indexOf('draft?.displayAddress')

    expect(searchIndex).toBeLessThan(toolbarIndex)
    expect(toolbarIndex).toBeLessThan(mapIndex)
    expect(mapIndex).toBeLessThan(coordinatesIndex)
    expect(coordinatesIndex).toBeLessThan(previewIndex)
    expect(component).toContain('h-[clamp(240px,34dvh,280px)]')
    expect(component).toContain('md:h-[clamp(300px,38dvh,340px)]')
    expect(component).toContain('lg:h-[clamp(360px,42dvh,420px)]')
    expect(component).toContain('ResizeObserver')
  })

  it('renders administrative popovers in a portal above the dialog with collision handling', () => {
    const combobox = source('BranchAdministrativeUnitCombobox.vue')
    const popoverContent = source('../../../components/ui/popover/PopoverContent.vue')

    expect(popoverContent).toContain('<PopoverPortal>')
    expect(combobox).toContain('z-[70]')
    expect(combobox).toContain(':collision-padding="16"')
    expect(combobox).toContain(':avoid-collisions="true"')
  })

  it('renders branch status as semantic text without a badge container', () => {
    const component = source('BranchStatusBadge.vue')

    expect(component).not.toContain("@/components/ui/badge")
    expect(component).not.toContain('<Badge')
    expect(component).toContain('text-emerald-600')
    expect(component).toContain('text-rose-600')
  })

  it('hides updatedAt and renders a date-only formatter and null-location empty state', () => {
    const component = source('../pages/BranchDetailPage.vue')

    expect(component).not.toContain('branch.updatedAt')
    expect(component).not.toContain('Ngày cập nhật')
    expect(component).toContain("import { formatDateTime } from '@/lib/date-format'")
    expect(component).toContain('return formatDateTime(value)')
    expect(component).toContain('Chi nhánh chưa được định vị trên bản đồ.')
  })

  it('keeps branch details in one responsive two-column card above a full-width map card', () => {
    const component = source('../pages/BranchDetailPage.vue')
    const detailMap = source('BranchDetailMap.vue')
    const infoIndex = component.indexOf('Thông tin chi nhánh</h2>')
    const contactIndex = component.indexOf('Liên hệ & Địa chỉ</h2>')
    const firstCardEnd = component.indexOf('</Card>', infoIndex)
    const mapIndex = component.indexOf('Bản đồ & Vị trí')

    expect(component).toContain('<Card class="min-w-0 gap-0 py-0">')
    expect(component).toContain('grid gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:grid-cols-2 lg:gap-0')
    expect(component).toContain('border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0')
    expect(component).toContain('<Card class="min-w-0 overflow-hidden">')
    expect(component).toContain('min-w-0 break-words')
    expect(detailMap).toContain('height-class="h-64 sm:h-72 lg:h-80"')
    expect(infoIndex).toBeGreaterThan(-1)
    expect(contactIndex).toBeGreaterThan(infoIndex)
    expect(contactIndex).toBeLessThan(firstCardEnd)
    expect(mapIndex).toBeGreaterThan(firstCardEnd)
  })

  it('initializes and resets the Branch list to code descending', () => {
    const listPage = source('../pages/BranchListPage.vue')
    const expectedDefaults = [
      "ref<BranchesListSortOrder>('desc')",
      "next.sortOrder ?? 'desc'",
      "initialSorting: [{ id: 'code', desc: true }]",
    ]
    expectedDefaults.forEach((value) => expect(listPage).toContain(value))
  })

  it('keeps authoritative pagination meta while the Branch list refetches', () => {
    const listPage = source('../pages/BranchListPage.vue')

    expect(listPage).toContain('placeholderData: keepPreviousData')
    expect(listPage).toContain('meta.value?.lastPage)')
    expect(listPage).toContain('meta.value?.total)')
    expect(listPage).not.toContain('meta.value?.lastPage ?? 0')
    expect(listPage).not.toContain('meta.value?.total ?? 0')
  })
})
