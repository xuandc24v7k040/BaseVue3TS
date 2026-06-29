# DataTable Testing Guide

DataTable tests use Vitest. Component and integration tests run with
`happy-dom`, Vue Test Utils, and Vue Router memory history.

## 1. Test Strategy

- Unit test: route-sync parser/serializer/comparators, adapter serializers, and
  small guard utilities.
- Composable test: query behavior, selection state, and persistence restore/save
  behavior without mounting a full page.
- Component test: DataTable UI interaction, emitted query model, selection UI,
  row interaction, and visible loading/error/empty states.
- Integration test: full DataTable + Vue Router route-sync using memory history.
- Optional E2E: a real admin page can still be covered later to verify backend
  data fetching, permissions, and browser-level accessibility.

## 2. What Is Covered

- Route sync: compact URL hydrate, table state to URL, external browser route
  changes, unrelated query preservation, legacy fallback, duplicate key guard,
  date range routes, invalid timezone-bearing datetime rejection.
- Search debounce: global search emits only after debounce and resets page to 1.
- Pagination: page and page-size changes emit immediately and do not wait for
  search debounce.
- Sorting: sortable headers emit TanStack-compatible sort state and reset page.
- Faceted filter: array filter set/clear behavior and active filter chip removal.
- Date filter: range set/clear behavior and compact URL serialization.
- Selection: uncontrolled, controlled, single-select, multi-select, header
  select-current-page, cross-page selected ids, and stable row id guards.
- Persistence: no-key no-op, valid state restore/save, version mismatch,
  corrupted JSON, page-size clamping, stale column visibility handling,
  duplicate persistence key DEV warning.
- Preset config: default admin table config, disabled route/persistence modes,
  and route/persistence override merging.
- Adapter: sort csv/array/object, key maps, search metadata fallback, local and
  ISO date range formats, empty value skipping, and input immutability.
- Loading/error/empty states: visible status text and `aria-busy` where supported.
- Accessibility-related assertions: labeled search input, pagination buttons,
  row selection checkboxes, row keyboard activation, and ignored checkbox row
  click propagation.

## 3. Route-Sync Test Matrix

| Case | Example URL | Expected |
| ---- | ----------- | -------- |
| Compact hydrate | `/users?q=abc&page=2&limit=20&sort=name:asc&role=admin,manager` | Search, page, page size, sort, and role array hydrate into `DataTableQuery`. |
| Table update to URL | `/users?tab=staff` then search/page/sort/filter changes | Managed compact keys are written and unrelated `tab=staff` remains. |
| Pagination immediate | Click next page while search debounce is pending | `page` emits and syncs immediately, independent of debounce. |
| External route change | `/users?q=external&page=3&limit=50` | Table state updates and emits the new query model. |
| Legacy fallback | `/users?users.search=legacy&users.page=2` | Namespaced legacy query still hydrates in compact mode. |
| Date range valid | `/users?createdAtFrom=2026-06-01&createdAtTo=2026-06-10` | Emits `createdAt` date range filter with `between` operator. |
| Local datetime valid | `/users?createdAtFrom=2026-06-01T08:30&createdAtTo=2026-06-10T17:45` | Parser accepts local datetime strings without timezone. |
| Invalid date | `/users?createdAtFrom=2026-02-30` | Invalid date is ignored; no broken filter is emitted. |
| Invalid time | `/users?createdAtFrom=2026-06-01T99:99` | Invalid datetime is ignored. |
| Timezone datetime | `/users?createdAtFrom=2026-06-01T08:30Z` | Timezone-bearing datetime is ignored. |
| Reversed range | `/users?createdAtFrom=2026-06-11&createdAtTo=2026-06-10` | Unsafe range is ignored by parser. |
| Duplicate route key | `paramNames.page = "q"` or filter maps colliding with `q/page/limit/sort` | DEV/test throws early with a route key collision error. |
| Managed clear | Clear search/filter back to default | Managed keys are removed without deleting unrelated query params. |

## 4. Selection Test Matrix

| Mode | Scenario | Expected |
| ---- | -------- | -------- |
| Uncontrolled multi-select | Click row checkboxes | Internal selection changes and `update:selectedRowIds` emits selected ids. |
| Uncontrolled clear | Header select current page, then reset/clear | Selected ids become empty when clear API/config path runs. |
| Uncontrolled single-select | Click A, then click B | Only B remains selected. |
| Controlled | Parent passes `selectedRowIds` and applies emitted update | UI reflects parent-updated selected ids. |
| Controlled parent ignores update | Parent does not change `selectedRowIds` after emit | UI remains driven by original prop and does not drift. |
| Cross-page | Current data has A/B, selected ids are A/C/D | `selectedIds` keeps A/C/D, `selectedCurrentPageRows` only contains A. |
| Deprecated slot alias | Use `selectedRows` | Alias remains current-page only for backward compatibility. |
| Missing stable id | Selection enabled and row id is missing | DEV/test throws with stable row id guidance. |
| Duplicate row id | Selection or expansion enabled with duplicate ids | DEV/test throws because selection/expansion would become unsafe. |
| Duplicate row id, no stateful feature | Duplicate ids with no selection/expansion | DEV/test warns but does not throw. |

## 5. Persistence Test Matrix

| Scenario | Expected |
| -------- | -------- |
| No `tableId`, `storageKey`, or `persistence.key` | Does not write to localStorage. |
| Valid persisted state | Restores/saves schema with version, page size, sorting, and column visibility. |
| Version mismatch | Ignores old persisted state. |
| Corrupted JSON | Does not crash and falls back to defaults. |
| Page size above `maxPageSize` | Resolved table state clamps to `maxPageSize`. |
| Unknown column visibility id | Stale id is ignored/sanitized by table state; known columns remain usable. |
| Duplicate mounted key | DEV warns that tables sharing one storage key can overwrite localStorage state. |

## 6. How To Run Tests

The project currently defines these relevant scripts in `package.json`:

```bash
npm run test
npm run build
```

Useful local commands:

```bash
npm run test
npm run test -- --watch
.\node_modules\.bin\vue-tsc.cmd -b
npm run build
```

`npm run build` already runs `vue-tsc -b` before `vite build`. There is no
dedicated `type-check` npm script at the time of writing.

## 7. How To Add New DataTable Tests

- Test behavior, not private implementation details.
- Use fake timers for debounce and always restore timers after each test.
- Use Vue Router memory history for route-sync integration tests.
- Mount a small parent wrapper when testing controlled props so prop updates are
  real.
- Provide stable `rowIdKey` or `getRowId` in selection tests.
- Prefer role, label, text, or explicit `data-test` selectors over Tailwind
  class assertions.
- Avoid large snapshots; assert specific visible state or emitted models.
- Clean up `localStorage`, mounted wrappers, and router state between tests.
- For date and datetime tests, avoid assertions that depend on the test
  machine timezone unless the adapter option being tested explicitly requires it.

## 8. Known Limitations

- No virtualization benchmark is automated yet; very large client-side datasets
  still need performance testing before relying on non-virtualized rendering.
- No full browser E2E test against a real admin page has been added yet.
- Screen reader behavior is partially asserted through labels/ARIA attributes,
  but manual assistive-technology testing is still needed before an accessibility
  sign-off.
- Large dataset performance and backend latency race conditions are not yet
  benchmarked in CI.
