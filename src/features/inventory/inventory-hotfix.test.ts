import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import detailSource from "./pages/StockReceiptDetailPage.vue?raw";
import formSource from "./pages/StockReceiptFormPage.vue?raw";
import listSource from "./pages/StockReceiptListPage.vue?raw";
import stocksSource from "./pages/InventoryStocksPage.vue?raw";
import columnsSource from "./components/inventory-columns.ts?raw";
import movementsSource from "./pages/InventoryMovementsPage.vue?raw";
import {
  createMovementColumns,
  createGroupedStockColumns,
  createReceiptColumns,
  createStockColumns,
  isReceiptSortBy,
  isStockSortBy,
} from "./components/inventory-columns";
import { inventoryErrorMessage } from "./utils/inventory-format";

describe("inventory hotfix contract", () => {
  it("only exposes backend-supported stock sort columns", () => {
    expect(
      [
        "productName",
        "sku",
        "quantity",
        "lowStockThreshold",
        "updatedAt",
      ].every(isStockSortBy),
    ).toBe(true);
    expect(isStockSortBy("stockState")).toBe(false);

    const sortableIds = createStockColumns()
      .filter((column) => typeof column.header === "function")
      .map((column) =>
        "accessorKey" in column ? column.accessorKey : undefined,
      );
    expect(sortableIds).toEqual([
      "productName",
      "sku",
      "quantity",
      "lowStockThreshold",
      "updatedAt",
    ]);
  });

  it("only exposes backend-supported receipt sort columns", () => {
    expect(
      ["code", "status", "createdAt", "confirmedAt"].every(isReceiptSortBy),
    ).toBe(true);
    expect(isReceiptSortBy("supplier")).toBe(false);
    expect(isReceiptSortBy("totalQuantity")).toBe(false);

    const sortableIds = createReceiptColumns("super-admin")
      .filter((column) => typeof column.header === "function")
      .map((column) =>
        "accessorKey" in column ? column.accessorKey : undefined,
      );
    expect(sortableIds).toEqual(["code", "status", "createdAt"]);
  });

  it("uses Vietnamese API messages without leaking Axios defaults", () => {
    const responseError = new AxiosError(
      "Request failed with status code 400",
      undefined,
      undefined,
      undefined,
      {
        data: { message: ["Bộ lọc không hợp lệ."] },
        status: 400,
        statusText: "Bad Request",
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      },
    );
    const networkError = new AxiosError("Network Error");
    const forbiddenError = new AxiosError(
      "Forbidden",
      undefined,
      undefined,
      undefined,
      {
        data: {},
        status: 403,
        statusText: "Forbidden",
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      },
    );

    expect(inventoryErrorMessage(responseError, "Không thể tải dữ liệu.")).toBe(
      "Bộ lọc không hợp lệ.",
    );
    expect(inventoryErrorMessage(networkError, "Không thể tải dữ liệu.")).toBe(
      "Không thể tải dữ liệu.",
    );
    expect(
      inventoryErrorMessage(forbiddenError, "Không thể tải dữ liệu."),
    ).toBe(
      "Bạn không có quyền chọn sản phẩm cho phiếu nhập tại chi nhánh này.",
    );
  });

  it("keeps the variant list inside a bounded grid scroll track", () => {
    expect(formSource).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(formSource).toContain(
      'class="h-full min-h-0 w-full overflow-hidden"',
    );
    expect(formSource).toContain("show-scroll-buttons");
    expect(formSource).not.toMatch(/DialogFooter[^>]*absolute/);
    expect(formSource).toContain("<Collapsible");
    expect(formSource).toContain('v-for="group in variantGroups"');
    expect(formSource).toContain("optionSummary");
    expect(formSource).toContain(
      'next.note = "Vui lòng nhập ghi chú phiếu nhập."',
    );
    expect(formSource).toContain('aria-describedby="receipt-note-error"');
    expect(formSource).toContain('class="ml-auto shrink-0 shadow-sm"');
    expect(formSource).not.toContain(
      "size-5 shrink-0 border-2 border-primary/70",
    );
    expect(formSource.match(/<Checkbox/g)).toHaveLength(2);
  });

  it("uses a shadcn horizontal ScrollArea only around receipt items", () => {
    expect(formSource).toContain('scrollbar-orientation="horizontal"');
    expect(formSource).toContain('class="w-full rounded-lg border pb-2"');
    expect(formSource).not.toContain(
      'class="overflow-x-auto rounded-lg border"',
    );
    expect(
      formSource.indexOf('scrollbar-orientation="horizontal"'),
    ).toBeLessThan(formSource.indexOf('class="sticky bottom-3'));
  });

  it("groups stock rows and keeps variant actions in an accessible menu", () => {
    expect(createGroupedStockColumns()).toHaveLength(5);
    expect(stocksSource).toContain("<DataTable");
    expect(stocksSource).toContain(':filterable-columns="filters"');
    expect(stocksSource).toContain("expansionMode: 'tree'");
    expect(stocksSource).toContain("getSubRows: (row) => row.children");
    expect(stocksSource).toContain('aria-label="Mở menu thao tác tồn kho"');
    expect(stocksSource).toContain('title="Thao tác tồn kho"');
    expect(stocksSource).not.toContain("<TooltipTrigger");
    expect(stocksSource).toContain("Điều chỉnh số lượng tồn");
    expect(stocksSource).toContain("Cập nhật ngưỡng tồn thấp");
    expect(columnsSource).toContain("CategoryThumbnail");
    expect(columnsSource).toContain('? "ĐƠN"');
    expect(columnsSource).not.toContain('? "SINGLE"');
    expect(stocksSource).not.toContain("Mặc định");
    expect(stocksSource).toContain("adjustmentQuantity.value > 1000");
    expect(stocksSource).toContain("adjustmentSubmitted.value = true");
    expect(stocksSource).toContain(':disabled="adjustmentSaving"');
    expect(stocksSource).not.toContain(
      ':disabled="!adjustmentValid || adjustmentSaving"',
    );
  });

  it("requires a valid first step before showing adjustment confirmation", () => {
    const continueBody = stocksSource.slice(
      stocksSource.indexOf("function continueAdjustment()"),
      stocksSource.indexOf("async function saveThreshold()"),
    );

    expect(continueBody).toContain("adjustmentSubmitted.value = true");
    expect(continueBody).toContain(
      "if (!adjusting.value || !adjustmentValid.value) return",
    );
    expect(continueBody).toContain('adjustmentStep.value = "confirm"');
    expect(continueBody).not.toContain("adjustStockQuantity(");
    expect(stocksSource).toContain('@click="continueAdjustment">Tiếp tục');
  });

  it("only mutates inventory from the confirmation step", () => {
    const saveBody = stocksSource.slice(
      stocksSource.indexOf("async function saveAdjustment()"),
      stocksSource.indexOf("</script>"),
    );

    expect(saveBody).toContain('adjustmentStep.value !== "confirm"');
    expect(saveBody).toContain("!canAdjustQuantity.value");
    expect(saveBody).toContain("adjustmentSaving.value");
    expect(saveBody).toContain("await adjustStockQuantity(");
    expect(stocksSource).toContain("Sản phẩm");
    expect(stocksSource).toContain("Biến thể");
    expect(stocksSource).toContain("SKU");
    expect(stocksSource).toContain("Chi nhánh");
    expect(stocksSource).toContain("Tồn hiện tại");
    expect(stocksSource).toContain("Tồn sau điều chỉnh");
    expect(stocksSource).toContain("Lý do");
  });

  it("keeps form state on back and requires reconfirmation after a stale conflict", () => {
    expect(stocksSource).toContain("@click=\"adjustmentStep = 'form'\"");
    expect(stocksSource).toContain("Quay lại");
    expect(stocksSource).toContain(
      'if (code === "INVENTORY_QUANTITY_CHANGED")',
    );
    expect(stocksSource).toContain('adjustmentStep.value = "form"');
    expect(stocksSource).toContain("adjustmentSubmitted.value = true");
    expect(stocksSource).toContain("adjustmentDirection === 'DECREASE'");
    expect(stocksSource).toContain("'destructive' : 'default'");
    expect(stocksSource).toContain(
      'v-if="canAny([ADMIN_PERMISSIONS.INVENTORY_ADJUST_QUANTITY])"',
    );
  });

  it("renders an append-only movement table with eight columns", () => {
    expect(createMovementColumns()).toHaveLength(8);
    expect(movementsSource).toContain("createMovementColumns");
    expect(movementsSource).toContain("Loại biến động");
    expect(movementsSource).toContain('mode: "range"');
    expect(movementsSource).toContain('title: "Thời gian"');
    expect(movementsSource).not.toContain("action");
  });

  it("uses an icon action and a shadcn horizontal ScrollArea on detail", () => {
    expect(listSource).toContain('aria-label="Mở menu thao tác phiếu nhập"');
    expect(listSource).toContain("<DropdownMenu");
    expect(listSource).toContain("Xem chi tiết");
    expect(detailSource).toContain("Quay lại danh sách");
    expect(detailSource).toContain('type="always"');
    expect(detailSource).toContain('scrollbar-orientation="horizontal"');
    expect(detailSource).not.toContain('class="overflow-x-auto"');
  });
});
