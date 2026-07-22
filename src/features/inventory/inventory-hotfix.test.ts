import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import detailSource from "./pages/StockReceiptDetailPage.vue?raw";
import formSource from "./pages/StockReceiptFormPage.vue?raw";
import listSource from "./pages/StockReceiptListPage.vue?raw";
import stocksSource from "./pages/InventoryStocksPage.vue?raw";
import {
  createReceiptColumns,
  createStockColumns,
  isReceiptSortBy,
  isStockSortBy,
} from "./components/inventory-columns";
import { inventoryErrorMessage } from "./utils/inventory-format";

describe("inventory hotfix contract", () => {
  it("only exposes backend-supported stock sort columns", () => {
    expect(["productName", "sku", "quantity", "lowStockThreshold", "updatedAt"].every(isStockSortBy)).toBe(true);
    expect(isStockSortBy("stockState")).toBe(false);

    const sortableIds = createStockColumns()
      .filter((column) => typeof column.header === "function")
      .map((column) => "accessorKey" in column ? column.accessorKey : undefined);
    expect(sortableIds).toEqual(["productName", "sku", "quantity", "lowStockThreshold", "updatedAt"]);
  });

  it("only exposes backend-supported receipt sort columns", () => {
    expect(["code", "status", "createdAt", "confirmedAt"].every(isReceiptSortBy)).toBe(true);
    expect(isReceiptSortBy("supplier")).toBe(false);
    expect(isReceiptSortBy("totalQuantity")).toBe(false);

    const sortableIds = createReceiptColumns("super-admin")
      .filter((column) => typeof column.header === "function")
      .map((column) => "accessorKey" in column ? column.accessorKey : undefined);
    expect(sortableIds).toEqual(["code", "status", "createdAt"]);
  });

  it("uses Vietnamese API messages without leaking Axios defaults", () => {
    const responseError = new AxiosError("Request failed with status code 400", undefined, undefined, undefined, {
      data: { message: ["Bộ lọc không hợp lệ."] },
      status: 400,
      statusText: "Bad Request",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });
    const networkError = new AxiosError("Network Error");
    const forbiddenError = new AxiosError("Forbidden", undefined, undefined, undefined, {
      data: {},
      status: 403,
      statusText: "Forbidden",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    });

    expect(inventoryErrorMessage(responseError, "Không thể tải dữ liệu.")).toBe("Bộ lọc không hợp lệ.");
    expect(inventoryErrorMessage(networkError, "Không thể tải dữ liệu.")).toBe("Không thể tải dữ liệu.");
    expect(inventoryErrorMessage(forbiddenError, "Không thể tải dữ liệu.")).toBe("Bạn không có quyền chọn sản phẩm cho phiếu nhập tại chi nhánh này.");
  });

  it("keeps the variant list inside a bounded grid scroll track", () => {
    expect(formSource).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(formSource).toContain('class="h-full min-h-0 w-full overflow-hidden"');
    expect(formSource).toContain("show-scroll-buttons");
    expect(formSource).not.toMatch(/DialogFooter[^>]*absolute/);
    expect(formSource).toContain("<Collapsible");
    expect(formSource).toContain('v-for="group in variantGroups"');
    expect(formSource).toContain("optionSummary");
  });

  it("uses a shadcn horizontal ScrollArea only around receipt items", () => {
    expect(formSource).toContain('scrollbar-orientation="horizontal"');
    expect(formSource).toContain('class="w-full rounded-lg border pb-2"');
    expect(formSource).not.toContain('class="overflow-x-auto rounded-lg border"');
    expect(formSource.indexOf('scrollbar-orientation="horizontal"')).toBeLessThan(
      formSource.indexOf('class="sticky bottom-3'),
    );
  });

  it("renders the threshold action as an accessible icon only", () => {
    expect(stocksSource).toContain('aria-label="Chỉnh ngưỡng cảnh báo"');
    expect(stocksSource).toContain('<Settings2 class="size-4" />');
    expect(stocksSource).toContain('<TooltipContent>Chỉnh ngưỡng cảnh báo</TooltipContent>');
    expect(stocksSource).not.toContain('class="mr-2 size-4" />Chỉnh ngưỡng cảnh báo');
  });

  it("uses an icon action and a shadcn horizontal ScrollArea on detail", () => {
    expect(listSource).toContain('aria-label="Xem chi tiết"');
    expect(listSource).toContain('<Eye class="size-4" />');
    expect(detailSource).toContain("Quay lại danh sách");
    expect(detailSource).toContain('type="always"');
    expect(detailSource).toContain('scrollbar-orientation="horizontal"');
    expect(detailSource).not.toContain('class="overflow-x-auto"');
  });
});
