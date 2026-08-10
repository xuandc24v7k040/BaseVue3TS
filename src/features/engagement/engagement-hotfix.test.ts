import { describe, expect, it, vi } from "vitest";
import detailSource from "@/pages/app/catalog/BookDetailPage.vue?raw";
import relatedProductsSource from "@/features/storefront/components/RelatedProductsSection.vue?raw";
import adminReviewColumnsSource from "./components/admin-review-columns.ts?raw";
import adminReviewPageSource from "./pages/AdminReviewListPage.vue?raw";
import { getWishlistStatus } from "./api/engagement-api";

const { customerWishlistStatusMock } = vi.hoisted(() => ({
  customerWishlistStatusMock: vi.fn(),
}));

vi.mock(
  "@/api/generated/endpoints/customer-wishlist/customer-wishlist",
  () => ({
    customerWishlistAdd: vi.fn(),
    customerWishlistList: vi.fn(),
    customerWishlistRemove: vi.fn(),
    customerWishlistStatus: customerWishlistStatusMock,
  }),
);

describe("Phase 17 engagement hotfix", () => {
  it("serializes wishlist product IDs without bracket suffixes", async () => {
    const productIds = ["product-1", "product-2"];
    const signal = new AbortController().signal;
    customerWishlistStatusMock.mockResolvedValue({
      data: { wishlistedProductIds: ["product-1"] },
    });

    const result = await getWishlistStatus(productIds, signal);

    expect(customerWishlistStatusMock).toHaveBeenCalledWith(
      { productIds },
      { paramsSerializer: { indexes: null } },
      signal,
    );
    expect(result.wishlistedProductIds).toEqual(["product-1"]);
  });

  it("uses the dedicated bounded shadcn carousel for related products", () => {
    expect(detailSource).toContain("<RelatedProductsSection");
    expect(detailSource).toContain(
      "grid min-w-0 items-start gap-5 xl:grid-cols-",
    );
    expect(relatedProductsSource).toContain("<Carousel");
    expect(relatedProductsSource).toContain(':opts="carouselOptions"');
    expect(relatedProductsSource).toContain("loop: false");
    expect(relatedProductsSource).toContain(".slice(0, 3)");
    expect(relatedProductsSource).toContain("related-carousel-control left-2");
    expect(relatedProductsSource).toContain("related-carousel-control right-2");
    expect(relatedProductsSource).toContain("disabled:opacity-0 lg:hidden");
    expect(relatedProductsSource).toContain(
      "@media (hover: hover) and (pointer: fine)",
    );
    expect(detailSource).not.toContain("<ScrollArea");
  });

  it("uses the shared admin DataTable controls for review moderation", () => {
    expect(adminReviewPageSource).toContain("<DataTable");
    expect(adminReviewPageSource).toContain(':filterable-columns="filters"');
    expect(adminReviewPageSource).toContain("enableColumnVisibility: true");
    expect(adminReviewPageSource).toContain("stickyActionColumn: true");
    expect(adminReviewPageSource).toContain("initialSorting:");
    expect(adminReviewPageSource).toContain("routeSync:");
    expect(adminReviewPageSource).toContain("#toolbar-right");
    expect(adminReviewPageSource).toContain("#row-actions");
    expect(adminReviewPageSource).toContain('size="icon-sm"');
    expect(adminReviewPageSource).toContain("rowData.isVisible ? Eye : EyeOff");
    expect(adminReviewPageSource).toContain(
      ":aria-label=\"rowData.isVisible ? 'Ẩn đánh giá' : 'Hiện đánh giá'\"",
    );
  });

  it("keeps long review cells bounded and shows the order below the product", () => {
    expect(adminReviewColumnsSource).toContain("row.original.orderCode");
    expect(adminReviewColumnsSource).not.toContain("row.original.product.slug");
    expect(adminReviewColumnsSource).toContain("truncate");
    expect(adminReviewColumnsSource).toContain("line-clamp-3");
    expect(adminReviewColumnsSource).toContain("break-words");
  });
});
