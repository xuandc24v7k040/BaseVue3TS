import { describe, expect, it } from "vitest";
import branchSelectorSource from "@/components/client/layout/BranchSelector.vue?raw";
import addressComboboxSource from "@/features/checkout/components/CheckoutAddressCombobox.vue?raw";
import checkoutApiSource from "@/features/checkout/api/checkout-api.ts?raw";
import cartApiSource from "@/features/cart/api/cart-api.ts?raw";
import checkoutStateSyncSource from "@/features/checkout/state/checkout-state-sync.ts?raw";
import inventoryStateSource from "@/features/storefront/state/inventory-state.ts?raw";
import inventorySyncSource from "@/features/storefront/state/inventory-sync-channel.ts?raw";
import checkoutSource from "./CheckoutPage.vue?raw";
import paymentResultSource from "./PaymentResultPage.vue?raw";
import successSource from "./CheckoutSuccessPage.vue?raw";

describe("Phase 15 checkout UI hotfix contract", () => {
  it("keeps Header as the only branch authority with guarded checkout changes", () => {
    expect(checkoutSource).not.toContain("Chi nhánh xử lý đơn");
    expect(checkoutSource).not.toContain("chooseBranch");
    expect(checkoutSource).not.toContain("window.confirm");
    expect(branchSelectorSource).not.toContain(':disabled="isCheckoutRoute"');
    expect(branchSelectorSource).toContain("AlertDialog");
    expect(branchSelectorSource).toContain("Thay đổi chi nhánh?");
    expect(
      branchSelectorSource.indexOf("cartActions.changeBranch"),
    ).toBeLessThan(branchSelectorSource.indexOf("await branchStore.select"));
  });

  it("uses a searchable address combobox and canonical saved-address payload", () => {
    expect(checkoutSource).not.toContain("NativeSelect");
    expect(checkoutSource).not.toMatch(/<select\b/);
    expect(checkoutSource).toContain("CheckoutAddressCombobox");
    expect(addressComboboxSource).toContain('role="combobox"');
    expect(addressComboboxSource).toContain("CommandInput");
    expect(addressComboboxSource).toContain("CommandItem");
    expect(addressComboboxSource).toContain("ArrowDown");
    expect(addressComboboxSource).toContain("ArrowUp");
    expect(checkoutSource).toContain(
      "source: SavedAddressInputDtoSource.SAVED_ADDRESS",
    );
    expect(checkoutSource).toContain("customerAddressId: addressId");
  });

  it("reviews current location before Apply and preserves one toast lifecycle", () => {
    expect(checkoutSource).toContain('<MapPin v-else class="size-4" />');
    expect(checkoutSource).not.toContain("LocateFixed");
    expect(checkoutSource).toContain("animate-spin");
    expect(checkoutSource).toContain(
      'const LOCATION_TOAST_ID = "checkout-current-location"',
    );
    expect(checkoutSource).toContain("Địa chỉ được phát hiện");
    expect(checkoutSource).toContain("Hủy bỏ");
    expect(checkoutSource).toContain("Áp dụng địa chỉ");
    expect(checkoutSource).toContain('@click="cancelDetectedLocation"');
    expect(checkoutSource).toContain('@click="confirmLocation"');
    expect(checkoutSource).toContain("reverseCheckoutLocation");
    expect(checkoutApiSource).toContain("AbortSignal");
    expect(checkoutApiSource).toContain("checkoutReverseCurrentLocation");
    expect(checkoutApiSource).not.toContain("vietMapReverse");
    expect(checkoutSource).toContain("locationProof: suggestion.locationProof");
    expect(checkoutSource).toContain('locationForm.locationProof = ""');
    expect(checkoutSource).toContain("CHECKOUT_LOCATION_PROOF_EXPIRED");
    expect(checkoutSource).toContain("CHECKOUT_LOCATION_PROOF_INVALID");
    expect(checkoutSource).toContain("CHECKOUT_LOCATION_PROOF_MISMATCH");
    expect(checkoutSource).not.toContain("Quận/Huyện");
    expect(checkoutSource).not.toContain("locationForm.districtName");
    expect(checkoutSource.indexOf("reverseCheckoutLocation")).toBeLessThan(
      checkoutSource.indexOf("async function confirmLocation"),
    );
  });

  it("uses saved addresses directly without pin confirmation", () => {
    expect(checkoutSource).not.toContain("NEEDS_LOCATION_CONFIRMATION");
    expect(checkoutSource).not.toContain("CheckoutPinConfirmationDialog");
    expect(checkoutSource).not.toContain("confirmSavedAddressPin");
    expect(checkoutSource).not.toContain("confirmedLatitude");
    expect(checkoutSource).not.toContain("confirmedLongitude");
    expect(checkoutSource).toContain("customerAddressId: addressId");
  });

  it("shows internal shipping province errors without exposing provider IDs", () => {
    expect(checkoutSource).toContain("CHECKOUT_SHIPPING_PROVINCE_REQUIRED");
    expect(checkoutSource).toContain("CHECKOUT_SHIPPING_PROVINCE_UNSUPPORTED");
    expect(checkoutSource).not.toContain("CHECKOUT_ORIGIN_GEOCODE");
    expect(checkoutSource).not.toContain("fromDistrictId");
    expect(checkoutSource).not.toContain("fromWardCode");
  });

  it("keeps partial-invalid items visible but excludes them from place order", () => {
    expect(checkoutSource).toContain("item.eligible");
    expect(checkoutSource).toContain("opacity-65");
    expect(checkoutSource).toContain("grayscale-[60%]");
    expect(checkoutSource).toContain("Không được tính vào đơn hàng");
    expect(checkoutSource).toContain("sản phẩm khả dụng");
    expect(checkoutSource).toContain("checkoutItemReasonMessage(item)");
    expect(checkoutSource).not.toContain("{{ item.reasonCode }}");
    expect(checkoutSource).not.toContain(
      "selectedCartItemIds: eligibleItems.value.map",
    );
    expect(checkoutSource).toContain("Một số sản phẩm không còn khả dụng tại");
    expect(checkoutSource).toContain(
      "Các sản phẩm đã chọn đều không còn khả dụng tại",
    );
  });

  it("keeps preview and Place Order on the same canonical selection", () => {
    expect(checkoutSource).toContain(
      "const currentInputFingerprint = computed",
    );
    expect(checkoutSource).toContain("committedInputFingerprint");
    expect(checkoutSource).toContain("previewDirty.value");
    expect(checkoutSource).toContain("sequence !== previewSequence");
    expect(checkoutSource).toContain(
      "requestedBranchId !== branchStore.selectedBranchId",
    );
    expect(checkoutSource).toContain("preview.branch.id !== requestedBranchId");
    expect(checkoutSource).toContain("CHECKOUT_PREVIEW_CHANGED");
    expect(checkoutSource).toContain("await refreshPreview()");
    expect(checkoutSource).not.toContain(
      "placeCodOrder(payload);\n      const order = await placeCodOrder",
    );
  });

  it("keeps note out of preview refresh while sending its latest value on Place Order", () => {
    const fingerprintSource = checkoutSource.slice(
      checkoutSource.indexOf("const currentInputFingerprint"),
      checkoutSource.indexOf("const committedInputFingerprint"),
    );
    const requestPayloadSource = checkoutSource.slice(
      checkoutSource.indexOf("function requestPayload"),
      checkoutSource.indexOf("function isCanceledRequest"),
    );

    expect(fingerprintSource).not.toContain("note:");
    expect(checkoutSource).not.toContain("watch(note");
    expect(checkoutSource).not.toContain("refreshNotePreview");
    expect(requestPayloadSource).toContain(
      "...(note.value.trim() ? { note: note.value.trim() } : {})",
    );
    expect(checkoutSource).toContain("...requestPayload()");
  });

  it("uses the active request branch for all-invalid feedback", () => {
    expect(checkoutSource).toContain(
      "async function redirectAllInvalid(branchName: string)",
    );
    expect(checkoutSource).not.toContain("draft.value?.branch.name ??");
    expect(checkoutSource).toContain(
      "if (nextBranchId !== branchStore.selectedBranchId) return;",
    );
  });

  it("synchronizes cart, availability and orders after authoritative success", () => {
    expect(cartApiSource).toContain("async refresh()");
    expect(cartApiSource).toContain("cartRequestSequence");
    expect(cartApiSource).toContain("sequence !== cartRequestSequence");
    expect(checkoutStateSyncSource).toContain("useCartActions().refresh()");
    expect(checkoutStateSyncSource).toContain("invalidateInventoryState()");
    expect(checkoutStateSyncSource).toContain("publishInventoryChanged()");
    expect(inventorySyncSource).toContain("BroadcastChannel");
    expect(inventorySyncSource).toContain('window.addEventListener("storage"');
    expect(inventoryStateSource).toContain("queryKey: cartQueryKey");
    expect(checkoutSource).toContain(
      'await synchronizeCheckoutState(true, "CLEAR_AFTER_COD")',
    );
    expect(
      checkoutSource.indexOf(
        'await synchronizeCheckoutState(true, "CLEAR_AFTER_COD")',
      ),
    ).toBeLessThan(checkoutSource.indexOf("client-checkout-success"));
    expect(paymentResultSource).toContain(
      'status === "PAID" ? "CLEAR_AFTER_VNPAY_PAID" : undefined',
    );
    expect(paymentResultSource).toContain(
      "await synchronizeCheckoutState(false)",
    );
  });

  it("bounds payment polling and renders all safe result states", () => {
    expect(paymentResultSource).toContain(
      "Date.now() - pollingStartedAt < 60_000",
    );
    expect(paymentResultSource).toContain("onBeforeUnmount");
    expect(paymentResultSource).toContain('returnResult ?? "invalid"');
    expect(paymentResultSource).toContain("Thanh toán thành công");
    expect(paymentResultSource).toContain(
      "Đơn hàng đã được ghi nhận và đang chờ xác nhận.",
    );
    expect(paymentResultSource).toContain(
      "orderStatusLabel(statusQuery.data.value.orderStatus)",
    );
    expect(paymentResultSource).not.toContain(
      "Bookora chỉ xác nhận đơn sau khi nhận IPN hợp lệ từ VNPAY.",
    );
    expect(paymentResultSource).toContain("Thanh toán thất bại");
    expect(paymentResultSource).toContain("Thanh toán đã hủy");
    expect(paymentResultSource).toContain("Đang xác nhận thanh toán");
    expect(paymentResultSource).toContain("Dữ liệu trả về không hợp lệ");
  });

  it("centers success and follows the Cart breadcrumb pattern", () => {
    expect(successSource).toContain("w-full min-w-0");
    expect(successSource).toContain("mx-auto w-full max-w-2xl");
    expect(checkoutSource).toContain('aria-label="Breadcrumb"');
    expect(checkoutSource).toContain('to="/" aria-label="Trang chủ"');
    expect(checkoutSource).toContain('to="/cart"');
    expect(checkoutSource).toContain('aria-current="page"');
    expect(checkoutSource).toContain("py-2 sm:py-3");
    expect(checkoutSource).not.toContain("ChevronRight");
  });

  it("uses shadcn RadioGroup, the local payment asset, and neutral shipping wording", () => {
    expect(checkoutSource).not.toMatch(/<input[^>]+type="radio"/);
    expect(checkoutSource).toContain("<RadioGroup");
    expect(checkoutSource).toContain("<RadioGroupItem");
    expect(checkoutSource).toContain('alt="VNPAY"');
    expect(checkoutSource).toContain("/Icon-VNPAY-QR.webp");
    expect(checkoutSource).toContain("Giao hàng tiêu chuẩn");
    expect(checkoutSource).toContain(
      "Phí theo tuyến, loại địa chỉ và khối lượng tính cước",
    );
    expect(checkoutSource).not.toContain("báo giá giao hàng thực tế");
    expect(checkoutSource).toContain("changePaymentMethod");
    expect(checkoutSource).not.toContain("Cập nhật phí theo phương thức");
  });
});
