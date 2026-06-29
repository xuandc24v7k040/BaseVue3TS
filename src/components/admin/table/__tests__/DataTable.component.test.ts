// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import type { ColumnDef, Table as TanStackTable } from "@tanstack/vue-table";
import { defineComponent, h, nextTick, ref } from "vue";
import DataTable from "../DataTable.vue";
import type {
  DataTableConfig,
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableGlobalSearch,
  DataTableQuery,
} from "../interface";

interface OrderRow {
  id?: string;
  name: string;
  role: string;
  createdAt: string;
}

const rows: OrderRow[] = [
  { id: "A", name: "Alice", role: "admin", createdAt: "2026-06-01" },
  { id: "B", name: "Bob", role: "manager", createdAt: "2026-06-02" },
];

const columns: ColumnDef<OrderRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) =>
      h(
        "button",
        {
          type: "button",
          "aria-label": "Sort name",
          onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
        },
        "Name",
      ),
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "role",
    cell: ({ row }) => row.original.role,
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => row.original.createdAt,
  },
];

const globalSearch: DataTableGlobalSearch = {
  columnIds: ["name"],
  title: "Search orders",
  placeholder: "Search orders",
};

const roleFilter: DataTableFilterableColumn = {
  id: "role",
  title: "Role",
  options: [
    { label: "Admin", value: "admin" },
    { label: "Manager", value: "manager" },
  ],
};

const dateColumn: DataTableDateColumn = {
  id: "createdAt",
  title: "Created at",
  mode: "range",
};

const mountedWrappers: VueWrapper[] = [];

function baseConfig(
  overrides: Partial<DataTableConfig<OrderRow>> = {},
): DataTableConfig<OrderRow> {
  return {
    tableId: "orders-component-test",
    rowIdKey: "id",
    pageSize: 2,
    searchDebounce: 50,
    enableColumnVisibility: false,
    ...overrides,
  };
}

function mountTable(
  options: {
    columns?: ColumnDef<OrderRow, unknown>[];
    config?: DataTableConfig<OrderRow>;
    data?: OrderRow[];
    pageCount?: number;
    rowCount?: number;
    enableSelection?: boolean;
    selectedRowIds?: string[];
    isLoading?: boolean;
    error?: string | Error | null;
    onRowClick?: (row: OrderRow) => void;
  } = {},
) {
  const wrapper = mount(DataTable<OrderRow>, {
    attachTo: document.body,
    props: {
      columns: options.columns ?? columns,
      data: options.data ?? rows,
      pageCount: options.pageCount ?? 3,
      rowCount: options.rowCount ?? 6,
      globalSearch,
      filterableColumns: [roleFilter],
      dateColumns: [dateColumn],
      config: options.config ?? baseConfig(),
      enableSelection: options.enableSelection,
      selectedRowIds: options.selectedRowIds,
      isLoading: options.isLoading,
      error: options.error,
      onRowClick: options.onRowClick,
    },
    slots: {
      filters: ({ table }) =>
        h("div", [
          h(
            "button",
            {
              type: "button",
              "data-test": "set-role-admin",
              onClick: () => table.getColumn("role")?.setFilterValue(["admin"]),
            },
            "Set admin",
          ),
          h(
            "button",
            {
              type: "button",
              "data-test": "set-date-range",
              onClick: () =>
                table.getColumn("createdAt")?.setFilterValue({
                  start: "2026-06-01",
                  end: "2026-06-10",
                }),
            },
            "Set date",
          ),
          h(
            "button",
            {
              type: "button",
              "data-test": "clear-date-range",
              onClick: () =>
                table.getColumn("createdAt")?.setFilterValue(undefined),
            },
            "Clear date",
          ),
        ]),
      "bulk-actions": ({ selectedIds, selectedCurrentPageRows }) =>
        h("div", {
          "data-test": "bulk-state",
          "data-selected-ids": selectedIds.join(","),
          "data-current-rows": selectedCurrentPageRows
            .map((row: OrderRow) => row.id)
            .join(","),
        }),
    },
  });
  mountedWrappers.push(wrapper);
  return wrapper;
}

function emittedQueries(wrapper: VueWrapper) {
  return ((wrapper.emitted("update:query") ?? []) as [DataTableQuery][]).map(
    ([query]) => query,
  );
}

async function flushAsync() {
  for (let i = 0; i < 5; i += 1) {
    await nextTick();
    await Promise.resolve();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => {
    try {
      wrapper.unmount();
    } catch {
      // The wrapper may already be unmounted inside a test.
    }
  });
  vi.useRealTimers();
  window.localStorage.clear();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("DataTable component interactions", () => {
  it("debounces global search and resets page to 1", async () => {
    const wrapper = mountTable({
      config: baseConfig({ initialPageIndex: 0 }),
    });
    const initialEmitCount = emittedQueries(wrapper).length;

    await wrapper.get('input[aria-label="Search orders"]').setValue("alice");
    await vi.advanceTimersByTimeAsync(49);

    expect(emittedQueries(wrapper)).toHaveLength(initialEmitCount);

    await vi.advanceTimersByTimeAsync(1);
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)).toMatchObject({
      page: 1,
      search: { value: "alice", columnIds: ["name"] },
    });

    const pagedWrapper = mountTable({
      config: baseConfig({ initialPageIndex: 1 }),
    });
    await pagedWrapper.get('input[aria-label="Search orders"]').setValue("bob");
    await flushAsync();
    expect(emittedQueries(pagedWrapper).at(-1)).toMatchObject({
      page: 1,
      search: { value: "bob", columnIds: ["name"] },
    });
  });

  it("emits page changes immediately even while search debounce is pending", async () => {
    const wrapper = mountTable({
      config: baseConfig({ initialPageIndex: 1 }),
    });

    await wrapper.get('input[aria-label="Search orders"]').setValue("alice");
    const beforePageClickCount = emittedQueries(wrapper).length;

    await wrapper.get('button[aria-label="Trang sau"]').trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).length).toBeGreaterThan(
      beforePageClickCount,
    );
    expect(emittedQueries(wrapper).at(-1)).toMatchObject({
      page: 2,
      search: { value: "alice", columnIds: ["name"] },
    });
  });

  it("emits sorting and resets page to 1", async () => {
    const wrapper = mountTable({
      config: baseConfig({ initialPageIndex: 1 }),
    });

    await wrapper.get('button[aria-label="Sort name"]').trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)).toMatchObject({
      page: 1,
      sort: [{ id: "name", desc: false }],
    });

    await wrapper.get('button[aria-label="Sort name"]').trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)).toMatchObject({
      sort: [{ id: "name", desc: true }],
    });
  });

  it("emits faceted filter changes and clear-all resets filters", async () => {
    const wrapper = mountTable({
      config: baseConfig({ initialPageIndex: 1 }),
    });

    await wrapper.get('[data-test="set-role-admin"]').trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)).toMatchObject({
      page: 1,
      filters: [{ id: "role", value: ["admin"], operator: "in" }],
    });

    await wrapper
      .get('button[aria-label="Xóa điều kiện Role"]')
      .trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)?.filters).toBeUndefined();
  });

  it("emits date range filters and clears them", async () => {
    const wrapper = mountTable();

    await wrapper.get('[data-test="set-date-range"]').trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)).toMatchObject({
      filters: [
        {
          id: "createdAt",
          value: { start: "2026-06-01", end: "2026-06-10" },
          operator: "between",
        },
      ],
    });

    await wrapper.get('[data-test="clear-date-range"]').trigger("click");
    await flushAsync();

    expect(emittedQueries(wrapper).at(-1)?.filters).toBeUndefined();
  });

  it("supports uncontrolled selection and header select-current-page", async () => {
    const wrapper = mountTable({
      enableSelection: true,
    });

    await wrapper
      .get('[aria-label="Chọn tất cả dòng trên trang hiện tại"]')
      .trigger("click");
    await flushAsync();

    expect(wrapper.emitted("update:selectedRowIds")?.at(-1)).toEqual([
      ["A", "B"],
    ]);
  });

  it("supports uncontrolled single-select mode", async () => {
    const wrapper = mountTable({
      enableSelection: true,
      config: baseConfig({ enableMultiRowSelection: false }),
    });

    await wrapper.get('[aria-label="Chọn dòng A"]').trigger("click");
    await flushAsync();

    expect(wrapper.emitted("update:selectedRowIds")?.at(-1)).toEqual([["A"]]);

    await wrapper.get('[aria-label="Chọn dòng B"]').trigger("click");
    await flushAsync();

    expect(wrapper.emitted("update:selectedRowIds")?.at(-1)).toEqual([["B"]]);
  });

  it("supports controlled selection when parent applies update:selectedRowIds", async () => {
    const Parent = defineComponent({
      setup() {
        const selected = ref<string[]>([]);
        return () =>
          h(DataTable<OrderRow>, {
            columns,
            data: rows,
            pageCount: 1,
            globalSearch,
            enableSelection: true,
            selectedRowIds: selected.value,
            config: baseConfig(),
            "onUpdate:selectedRowIds": (ids: string[]) => {
              selected.value = ids;
            },
          });
      },
    });
    const wrapper = mount(Parent, { attachTo: document.body });
    mountedWrappers.push(wrapper);

    await wrapper.get('[aria-label="Chọn dòng A"]').trigger("click");
    await flushAsync();

    expect(
      wrapper.get('[aria-label="Chọn dòng A"]').attributes("data-state"),
    ).toBe("checked");
  });

  it("does not retain controlled selection when parent ignores emitted ids", async () => {
    const wrapper = mountTable({
      enableSelection: true,
      selectedRowIds: [],
    });

    await wrapper.get('[aria-label="Chọn dòng A"]').trigger("click");
    await flushAsync();

    expect(wrapper.emitted("update:selectedRowIds")?.at(-1)).toEqual([["A"]]);
    expect(
      wrapper.get('[aria-label="Chọn dòng A"]').attributes("data-state"),
    ).toBe("unchecked");
  });

  it("keeps cross-page selectedIds while only current-page rows are checked/rendered", async () => {
    const wrapper = mountTable({
      enableSelection: true,
      selectedRowIds: ["A", "C", "D"],
    });

    const bulkState = wrapper.get('[data-test="bulk-state"]');
    expect(bulkState.attributes("data-selected-ids")).toBe("A,C,D");
    expect(bulkState.attributes("data-current-rows")).toBe("A");
    expect(
      wrapper.get('[aria-label="Chọn dòng A"]').attributes("data-state"),
    ).toBe("checked");
    expect(
      wrapper.get('[aria-label="Chọn dòng B"]').attributes("data-state"),
    ).toBe("unchecked");
  });

  it("applies sticky column offsets and recalculates them after visibility changes", async () => {
    const stickyColumns: ColumnDef<OrderRow, unknown>[] = [
      {
        accessorKey: "name",
        size: 120,
        header: "Name",
        cell: ({ row }) => row.original.name,
        meta: { sticky: "left" },
      },
      {
        accessorKey: "role",
        size: 100,
        header: "Role",
        cell: ({ row }) => row.original.role,
        meta: { sticky: "left" },
      },
      {
        accessorKey: "createdAt",
        size: 140,
        header: "Created",
        cell: ({ row }) => row.original.createdAt,
        meta: { sticky: "right" },
      },
    ];
    const wrapper = mountTable({
      columns: stickyColumns,
      config: baseConfig({
        enableColumnSticky: true,
        enableColumnVisibility: true,
        stickySelectionColumn: true,
      }),
      enableSelection: true,
    });
    await flushAsync();

    const getHeaderStyle = (text: string) => {
      const header = wrapper
        .findAll("th")
        .find((cell) => cell.text().includes(text));
      if (!header) throw new Error(`Missing header: ${text}`);
      return header.attributes("style") ?? "";
    };

    expect(getHeaderStyle("Name")).toContain("left: 40px");
    expect(getHeaderStyle("Role")).toContain("left: 160px");
    expect(getHeaderStyle("Created")).toContain("right: 0px");

    const exposed = wrapper.vm as unknown as { table: TanStackTable<OrderRow> };
    exposed.table.getColumn("name")?.toggleVisibility(false);
    await nextTick();

    expect(getHeaderStyle("Role")).toContain("left: 40px");
  });

  it("renders loading, error, empty states and accessibility attributes", () => {
    const refetchingWrapper = mountTable({ isLoading: true });
    expect(refetchingWrapper.find('[role="status"]').exists()).toBe(true);
    expect(refetchingWrapper.find('[aria-busy="true"]').exists()).toBe(true);
    refetchingWrapper.unmount();

    const skeletonWrapper = mountTable({
      data: [],
      rowCount: 0,
      pageCount: 0,
      isLoading: true,
    });
    expect(
      skeletonWrapper.findAll('[data-test="data-table-skeleton-row"]'),
    ).toHaveLength(2);
    expect(skeletonWrapper.find('[role="status"]').exists()).toBe(false);
    skeletonWrapper.unmount();

    const errorWrapper = mountTable({ error: "API failed" });
    expect(errorWrapper.get('[role="alert"]').text()).toContain("API failed");
    errorWrapper.unmount();

    const emptyWrapper = mountTable({ data: [], rowCount: 0, pageCount: 0 });
    expect(emptyWrapper.text()).toContain("Không có dữ liệu");
  });

  it("emits row-click for row interaction but ignores checkbox clicks", async () => {
    const onRowClick = vi.fn();
    const wrapper = mountTable({
      enableSelection: true,
      config: baseConfig({ enableRowClick: true }),
      onRowClick,
    });

    await wrapper.get('[data-row-id="A"]').trigger("click");
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);

    await wrapper.get('[aria-label="Chọn dòng A"]').trigger("click");
    expect(onRowClick).toHaveBeenCalledTimes(1);

    await wrapper.get('[data-row-id="A"]').trigger("keydown", { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("throws in DEV when selection is enabled without stable row ids or with duplicate row ids", () => {
    expect(() =>
      mountTable({
        enableSelection: true,
        data: [{ name: "Missing id", role: "admin", createdAt: "2026-06-01" }],
      }),
    ).toThrow(/Missing value for key "id"/);

    expect(() =>
      mountTable({
        enableSelection: true,
        data: [
          { id: "A", name: "Alice", role: "admin", createdAt: "2026-06-01" },
          {
            id: "A",
            name: "Duplicate Alice",
            role: "manager",
            createdAt: "2026-06-02",
          },
        ],
      }),
    ).toThrow(/Duplicate row id "A"/);
  });

  it("warns in DEV when mounted tables share the same persistence key", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    mountTable({
      config: baseConfig({
        tableId: "shared-persistence-key",
        persistence: true,
      }),
    });
    mountTable({
      config: baseConfig({
        tableId: "shared-persistence-key",
        persistence: true,
      }),
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Duplicate persistence key "dt:shared-persistence-key"',
      ),
    );
  });
});
