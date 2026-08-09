import { describe, expect, it } from "vitest";
import alertDialogContentSource from "@/components/ui/alert-dialog/AlertDialogContent.vue?raw";
import branchSelectorSource from "@/components/client/layout/BranchSelector.vue?raw";
import headerSource from "@/components/client/layout/ClientHeader.vue?raw";
import bookSectionSource from "@/components/client/home/BookSection.vue?raw";
import cardSource from "@/features/storefront/components/ProductCard.vue?raw";
import detailSource from "@/pages/app/catalog/BookDetailPage.vue?raw";
import dashboardSource from "@/pages/app/account/AccountOverviewPage.vue?raw";
import wishlistSource from "@/pages/app/account/AccountFavoritesPage.vue?raw";
import reviewsSource from "@/pages/app/account/AccountReviewsPage.vue?raw";
import publicReviewsSource from "./components/PublicReviewSection.vue?raw";
import dialogSource from "./components/ReviewFormDialog.vue?raw";
import wishlistButtonSource from "./components/WishlistButton.vue?raw";

describe("Phase 17 UI/UX hotfix contracts", () => {
  it("shows only the selected branch name while preserving the empty placeholder", () => {
    expect(branchSelectorSource).toContain(
      'branchStore.selectedBranch?.name ??',
    );
    expect(branchSelectorSource).toContain('"Chọn chi nhánh")');
    expect(branchSelectorSource).not.toContain(
      '<span class="hidden xl:inline">Chọn chi nhánh: </span>',
    );
    expect(branchSelectorSource).toContain("max-w-48 truncate text-sm");
    expect(branchSelectorSource).toContain('@click="openSelector"');
  });

  it("routes both header wishlist actions without a deferred placeholder", () => {
    expect(headerSource).toContain('router.push("/account/wishlist")');
    expect(headerSource).not.toContain("storefront-wishlist-deferred");
    expect(headerSource).not.toContain("Tính năng yêu thích sẽ");
    expect(headerSource.match(/cursor-pointer/g)).toHaveLength(6);
  });

  it("keeps ProductCard borders stable inside an automatic ScrollArea", () => {
    expect(cardSource).not.toContain("hover:-translate-y");
    expect(cardSource).toContain("hover:border-[var(--bookora-green)]/50");
    expect(cardSource).toContain("focus-within:border");
    expect(bookSectionSource).toContain("<ScrollArea");
    expect(bookSectionSource).toContain('type="auto"');
    expect(bookSectionSource).toContain("pb-3 pt-1");
    expect(bookSectionSource).not.toContain("overflow-x-auto");
  });

  it("places the compact wishlist heart in the Product Detail title row", () => {
    expect(detailSource.indexOf("<WishlistButton")).toBeLessThan(
      detailSource.indexOf("<dl"),
    );
    expect(detailSource).toContain("min-w-0 flex-1 break-words");
    expect(detailSource).not.toContain(':compact="false"');
    expect(wishlistButtonSource).toContain(
      'class="cursor-pointer disabled:cursor-not-allowed"',
    );
    expect(detailSource).toContain(
      "xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
    );
    expect(detailSource).not.toContain(
      "activeTab === 'reviews'\n            ? ''",
    );
  });

  it("implements review summary, wrapping filters and safe content", () => {
    expect(publicReviewsSource).toContain("ratingDistribution");
    expect(publicReviewsSource).toContain("<Progress");
    expect(publicReviewsSource).toContain("<RadioGroup");
    expect(publicReviewsSource).toContain(
      'class="!flex min-w-0 flex-wrap gap-2"',
    );
    expect(publicReviewsSource.match(/<RadioGroup\b/g)).toHaveLength(1);
    expect(publicReviewsSource).toContain("has-[:focus-visible]:ring-2");
    expect(publicReviewsSource).toContain(
      "border-[var(--bookora-green)]/45 bg-[var(--bookora-green)]/5 font-semibold",
    );
    expect(publicReviewsSource).not.toContain("focus-within:ring-2");
    expect(publicReviewsSource).not.toContain("<ScrollArea");
    expect(publicReviewsSource).not.toContain("lg:hidden");
    expect(publicReviewsSource).not.toContain("lg:flex");
    expect(publicReviewsSource).not.toContain("min-h-64");
    expect(publicReviewsSource).not.toContain("min-h-48 rounded-xl");
    expect(publicReviewsSource).toContain("verifiedPurchase");
    expect(publicReviewsSource).toContain("placeholderData");
    expect(publicReviewsSource).toContain(
      "const PUBLIC_REVIEW_PAGE_SIZE = 4",
    );
    expect(publicReviewsSource).toContain("limit: PUBLIC_REVIEW_PAGE_SIZE");
    expect(publicReviewsSource).toContain("page.value = 1");
    expect(publicReviewsSource).toContain('aria-label="Phân trang đánh giá"');
    expect(publicReviewsSource).toContain("formatRelativeTime");
    expect(publicReviewsSource).toContain('"Không có nội dung đánh giá."');
    expect(publicReviewsSource).toContain("[overflow-wrap:anywhere]");
    expect(publicReviewsSource).not.toContain("Có hình ảnh");
  });

  it("keeps review dialog actions fixed, accessible and single-submit", () => {
    expect(dialogSource).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(dialogSource).toContain('<ScrollArea type="auto"');
    expect(dialogSource.match(/<ScrollArea\b/g)).toHaveLength(1);
    expect(dialogSource).toContain("<Textarea");
    expect(dialogSource).toContain("max-h-56 resize-y overflow-y-auto");
    expect(dialogSource).toContain(
      "focus-visible:border-[var(--bookora-green)]/35",
    );
    expect(dialogSource).toContain("focus-visible:ring-1");
    expect(dialogSource).toContain(
      "focus-visible:ring-[var(--bookora-green)]/15",
    );
    expect(dialogSource).not.toContain("[field-sizing:content]");
    expect(dialogSource).toContain('@submit.prevent="submit"');
    expect(dialogSource).toContain('type="submit"');
    expect(dialogSource).toContain("mutation.isPending.value");
    expect(dialogSource).toContain("Rất tệ");
    expect(dialogSource).toContain("Tuyệt vời");
    expect(dialogSource).not.toContain("Theo trải nghiệm");
    expect(dialogSource).not.toContain("Ảnh/video");
  });

  it("uses underline review tabs and confirms delete with AlertDialog", () => {
    const writtenReviewsSource = reviewsSource.slice(
      reviewsSource.indexOf('<TabsContent value="written"'),
    );

    expect(reviewsSource).toContain("<Tabs");
    expect(reviewsSource).toContain("data-[state=active]:border");
    expect(reviewsSource).toContain("<AlertDialog");
    expect(reviewsSource).toContain('@click="confirmDelete"');
    expect(alertDialogContentSource).toContain("pointer-events-auto");
    expect(reviewsSource).not.toContain("<AlertDialogAction");
    expect(reviewsSource).toContain('<AlertDialogContent class="z-[51]">');
    expect(reviewsSource).not.toContain("item.isVisible");
    expect(reviewsSource).not.toContain("Đánh giá đang bị ẩn");
    expect(writtenReviewsSource).toContain("Mã: {{ item.orderCode }}");
    expect(writtenReviewsSource).not.toContain(
      '<p class="font-medium">Đơn hàng</p>',
    );
  });

  it("renders wishlist rows without obsolete controls or bordered hearts", () => {
    expect(cardSource).toContain("<WishlistButton");
    expect(detailSource).toContain("<WishlistButton");
    expect(wishlistButtonSource).toContain(
      "fill-current text-[var(--bookora-green)]",
    );
    expect(wishlistSource).toContain("lg:grid-cols-[5rem_minmax");
    expect(wishlistSource).toContain("item.product.averageRating");
    expect(wishlistSource).toContain("item.createdAt");
    expect(wishlistSource).toContain('variant="ghost"');
    expect(wishlistSource).toContain("fill-current");
    expect(wishlistSource).toContain(
      "text-[var(--bookora-green)] hover:bg-[var(--bookora-soft)]",
    );
    expect(wishlistSource).not.toContain(
      "text-red-500 hover:bg-red-50 hover:text-red-600",
    );
    expect(wishlistSource).not.toContain("isAvailable");
    expect(wishlistSource).not.toContain("search");
    expect(wishlistSource).toContain("limit: 4");
  });

  it("enriches latest order and fixes dashboard wishlist title height", () => {
    expect(dashboardSource).toContain("customerOrderStatusLabel");
    expect(dashboardSource).toContain("formatDateTime");
    expect(dashboardSource).toContain("latestOrder.itemCount");
    expect(dashboardSource).toContain('type="auto"');
    expect(dashboardSource).toContain("line-clamp-2 min-h-10 break-words");
    expect(dashboardSource).toContain("/account/reviews?tab=written");
    expect(dashboardSource).toContain("/account/reviews?tab=pending");
    expect(reviewsSource).toContain(
      'firstQueryValue(route.query.tab) === "written" ? "written" : "pending"',
    );
  });
});
