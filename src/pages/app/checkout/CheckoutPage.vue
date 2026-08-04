<script setup lang="ts">
import {
  Check,
  Home,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  WalletCards,
} from "@lucide/vue";
import axios from "axios";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type {
  CheckoutPreviewResponseDto,
  CheckoutItemResponseDto,
  CurrentLocationAddressDto,
  PlaceOrderDto,
  PreviewCheckoutDto,
  SavedAddressInputDto,
} from "@/api/generated/models";
import {
  CurrentLocationAddressDtoSource,
  PreviewCheckoutDtoPaymentMethod,
  SavedAddressInputDtoSource,
} from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  placeCodOrder,
  placeVnpayOrder,
  previewCheckout,
  reverseCheckoutLocation,
} from "@/features/checkout/api/checkout-api";
import CheckoutAddressCombobox from "@/features/checkout/components/CheckoutAddressCombobox.vue";
import { parseCheckoutCartItemIds } from "@/features/checkout/utils/checkout-selection";
import { useCustomerAddresses } from "@/features/customer-account/composables/use-customer-account";
import { synchronizeCheckoutState } from "@/features/checkout/state/checkout-state-sync";
import { subscribeInventoryInvalidation } from "@/features/storefront/state/inventory-sync-channel";
import type { InventoryInvalidationContext } from "@/features/storefront/state/inventory-state";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";

const route = useRoute();
const router = useRouter();
const selectedCartItemIds = computed(() =>
  parseCheckoutCartItemIds(route.query.items),
);
const draft = ref<CheckoutPreviewResponseDto | null>(null);
const isLoading = ref(true);
const isMutating = ref(false);
const isPreviewPending = ref(false);
const isLocating = ref(false);
const isResolvingLocation = ref(false);
const showCurrentLocation = ref(false);
const detectedDisplayAddress = ref("");
const locationError = ref<string | null>(null);
const pendingSavedAddressId = ref("");
const paymentMethod = ref<PreviewCheckoutDtoPaymentMethod>(
  PreviewCheckoutDtoPaymentMethod.COD,
);
const note = ref("");
const addressInput = ref<
  SavedAddressInputDto | CurrentLocationAddressDto | null
>(null);
const addressesQuery = useCustomerAddresses();
const branchStore = useStorefrontBranchStore();
const placeOrderIdempotencyKeys = new Map<string, string>();
const LOCATION_TOAST_ID = "checkout-current-location";
const SAVED_ADDRESS_TOAST_ID = "checkout-saved-address-resolution";
const AVAILABILITY_TOAST_ID = "checkout-item-availability";
let previewController: AbortController | null = null;
let previewSequence = 0;
let locationController: AbortController | null = null;
let lastAvailabilitySignature = "";
let isApplyingVerifiedLocation = false;
const locationForm = reactive<CurrentLocationAddressDto>({
  source: CurrentLocationAddressDtoSource.CURRENT_LOCATION,
  latitude: 0,
  longitude: 0,
  receiverName: "",
  receiverPhone: "",
  addressLine: "",
  provinceName: "",
  provinceCode: 0,
  wardName: "",
  locationProof: "",
  locationProvider: "VIETMAP",
});
const money = new Intl.NumberFormat("vi-VN");
const isBusy = computed(
  () =>
    isMutating.value ||
    isPreviewPending.value ||
    isLocating.value ||
    isResolvingLocation.value,
);
const eligibleItems = computed(
  () => draft.value?.items.filter((item) => item.eligible) ?? [],
);
const invalidItems = computed(
  () => draft.value?.items.filter((item) => !item.eligible) ?? [],
);
const currentInputFingerprint = computed(() =>
  JSON.stringify({
    branchId: branchStore.selectedBranchId,
    selectedCartItemIds: [...selectedCartItemIds.value].sort(),
    address: addressInput.value,
    paymentMethod: paymentMethod.value,
  }),
);
const committedInputFingerprint = ref("");
const previewDirty = computed(
  () => committedInputFingerprint.value !== currentInputFingerprint.value,
);

const selectedAddressId = computed(() =>
  addressInput.value?.source === SavedAddressInputDtoSource.SAVED_ADDRESS
    ? addressInput.value.customerAddressId
    : "",
);
const placeOrderBlocker = computed(() => {
  if (selectedCartItemIds.value.length === 0)
    return "Vui lòng chọn ít nhất một sản phẩm.";
  if (!addressInput.value)
    return "Vui lòng chọn hoặc áp dụng một địa chỉ giao hàng.";
  if (previewDirty.value) return "Thông tin thanh toán đang được cập nhật.";
  if (isPreviewPending.value) return "Đang cập nhật giá và phí vận chuyển.";
  if (!draft.value?.shippingQuote) return "Chưa tính được phí vận chuyển.";
  if (!draft.value.canPlaceOrder)
    return (
      draft.value.blockingIssues[0] ?? "Đơn hàng chưa đủ điều kiện để đặt."
    );
  return null;
});

function formatPrice(value: number | null | undefined): string {
  return `${money.format(value ?? 0)}đ`;
}

function requestPayload(): PreviewCheckoutDto {
  return {
    selectedCartItemIds: selectedCartItemIds.value,
    ...(addressInput.value ? { address: addressInput.value } : {}),
    paymentMethod: paymentMethod.value,
    ...(note.value.trim() ? { note: note.value.trim() } : {}),
  } satisfies PreviewCheckoutDto;
}

function isCanceledRequest(error: unknown): boolean {
  return (
    axios.isCancel(error) ||
    (axios.isAxiosError(error) && error.code === "ERR_CANCELED")
  );
}

function checkoutErrorCode(error: unknown): string | undefined {
  return axios.isAxiosError(error)
    ? (error.response?.data as { code?: string } | undefined)?.code
    : undefined;
}

function checkoutErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  }
  const code = checkoutErrorCode(error);
  const messages: Record<string, string> = {
    CHECKOUT_ITEMS_REQUIRED: "Vui lòng chọn ít nhất một sản phẩm.",
    CHECKOUT_CART_ITEM_NOT_FOUND: "Sản phẩm đã chọn không còn trong giỏ hàng.",
    CHECKOUT_BRANCH_MISMATCH:
      "Chi nhánh giỏ hàng chưa đồng bộ. Vui lòng thử lại.",
    CHECKOUT_SHIPPING_PROVINCE_REQUIRED:
      "Chưa có đủ thông tin tỉnh/thành phố để tính phí vận chuyển.",
    CHECKOUT_SHIPPING_PROVINCE_UNSUPPORTED:
      "Tỉnh/thành phố này hiện chưa được hỗ trợ tính phí vận chuyển.",
    CHECKOUT_OUT_OF_STOCK: "Sản phẩm đã chọn hiện đã hết hàng.",
    CHECKOUT_INSUFFICIENT_STOCK: "Số lượng đã chọn vượt quá tồn kho hiện tại.",
    CHECKOUT_PRODUCT_INACTIVE: "Sản phẩm đã ngừng kinh doanh.",
    CHECKOUT_VARIANT_INACTIVE: "Phiên bản sản phẩm không còn khả dụng.",
    CHECKOUT_CURRENT_LOCATION_INCOMPLETE:
      "Vị trí chưa có đủ tỉnh/thành phố và phường/xã.",
    CHECKOUT_LOCATION_PROOF_INVALID:
      "Xác nhận vị trí không hợp lệ. Vui lòng lấy lại vị trí hiện tại.",
    CHECKOUT_LOCATION_PROOF_EXPIRED:
      "Xác nhận vị trí đã hết hạn. Vui lòng lấy lại vị trí hiện tại.",
    CHECKOUT_LOCATION_PROOF_MISMATCH:
      "Thông tin vị trí đã thay đổi. Vui lòng lấy lại vị trí hiện tại.",
  };
  return code
    ? (messages[code] ?? "Không thể cập nhật thông tin thanh toán.")
    : "Không thể cập nhật thông tin thanh toán.";
}

function checkoutItemReasonMessage(item: CheckoutItemResponseDto): string {
  return item.reasonMessage || "Sản phẩm hiện không thể đặt tại chi nhánh này.";
}

function availabilitySignature(preview: CheckoutPreviewResponseDto): string {
  return preview.items
    .filter((item) => !item.eligible)
    .map((item) => `${item.cartItemId}:${item.reasonCode ?? "UNKNOWN"}`)
    .sort()
    .join("|");
}

function announcePartialAvailability(
  preview: CheckoutPreviewResponseDto,
): void {
  const signature = availabilitySignature(preview);
  if (!signature || signature === lastAvailabilitySignature) return;
  lastAvailabilitySignature = signature;
  const branchName = preview.branch.name;
  toast.warning(
    `Một số sản phẩm không còn khả dụng tại ${branchName}. Bookora đã cập nhật lại đơn hàng.`,
    { id: AVAILABILITY_TOAST_ID },
  );
}

function isAllItemsInvalidError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const code = (error.response?.data as { code?: string } | undefined)?.code;
  return [
    "CHECKOUT_OUT_OF_STOCK",
    "CHECKOUT_INSUFFICIENT_STOCK",
    "CHECKOUT_PRODUCT_INACTIVE",
    "CHECKOUT_VARIANT_INACTIVE",
    "CHECKOUT_BRANCH_INACTIVE",
  ].includes(code ?? "");
}

async function redirectAllInvalid(branchName: string): Promise<void> {
  toast.warning(
    `Các sản phẩm đã chọn đều không còn khả dụng tại ${branchName}. Bạn đã được đưa về giỏ hàng để kiểm tra lại.`,
    { id: AVAILABILITY_TOAST_ID },
  );
  await router.replace({ name: "client-cart" });
}

async function loadPreview(): Promise<void> {
  if (selectedCartItemIds.value.length === 0) {
    toast.warning("Vui lòng chọn sản phẩm trong giỏ hàng trước.");
    await router.replace({ name: "client-cart" });
    return;
  }
  isLoading.value = true;
  previewController?.abort();
  const controller = new AbortController();
  previewController = controller;
  const sequence = ++previewSequence;
  const requestedBranchId = branchStore.selectedBranchId;
  const requestedBranchName =
    branchStore.selectedBranch?.name ?? "chi nhánh đã chọn";
  const inputFingerprint = currentInputFingerprint.value;
  try {
    const preview = await previewCheckout(requestPayload(), controller.signal);
    if (
      sequence !== previewSequence ||
      controller.signal.aborted ||
      requestedBranchId !== branchStore.selectedBranchId ||
      preview.branch.id !== requestedBranchId
    ) {
      return;
    }
    draft.value = preview;
    committedInputFingerprint.value = inputFingerprint;
    announcePartialAvailability(preview);
  } catch (error: unknown) {
    if (
      isCanceledRequest(error) ||
      sequence !== previewSequence ||
      requestedBranchId !== branchStore.selectedBranchId
    ) {
      return;
    }
    if (isAllItemsInvalidError(error)) {
      await redirectAllInvalid(requestedBranchName);
      return;
    }
    toast.error(checkoutErrorMessage(error));
    await router.replace({ name: "client-cart" });
  } finally {
    isLoading.value = false;
  }
}

async function refreshPreview(): Promise<void> {
  previewController?.abort();
  const controller = new AbortController();
  previewController = controller;
  const sequence = ++previewSequence;
  const requestedBranchId = branchStore.selectedBranchId;
  const inputFingerprint = currentInputFingerprint.value;
  isPreviewPending.value = true;
  try {
    const nextDraft = await previewCheckout(
      requestPayload(),
      controller.signal,
    );
    if (
      sequence !== previewSequence ||
      controller.signal.aborted ||
      requestedBranchId !== branchStore.selectedBranchId ||
      nextDraft.branch.id !== requestedBranchId
    ) {
      return;
    }
    draft.value = nextDraft;
    committedInputFingerprint.value = inputFingerprint;
    announcePartialAvailability(nextDraft);
  } catch (error: unknown) {
    if (
      isCanceledRequest(error) ||
      sequence !== previewSequence ||
      requestedBranchId !== branchStore.selectedBranchId
    ) {
      return;
    }
    throw error;
  } finally {
    if (sequence === previewSequence) isPreviewPending.value = false;
  }
}

async function chooseSavedAddress(addressId: string): Promise<void> {
  if (!addressId) return;
  const previousAddress = addressInput.value;
  pendingSavedAddressId.value = addressId;
  toast.loading("Đang tính phí vận chuyển cho địa chỉ này...", {
    id: SAVED_ADDRESS_TOAST_ID,
  });
  try {
    locationForm.locationProof = "";
    addressInput.value = {
      source: SavedAddressInputDtoSource.SAVED_ADDRESS,
      customerAddressId: addressId,
    };
    locationError.value = null;
    await refreshPreview();
    showCurrentLocation.value = false;
    toast.success("Đã áp dụng địa chỉ giao hàng.", {
      id: SAVED_ADDRESS_TOAST_ID,
    });
  } catch (error: unknown) {
    if (isCanceledRequest(error)) return;
    addressInput.value = previousAddress;
    pendingSavedAddressId.value =
      previousAddress?.source === SavedAddressInputDtoSource.SAVED_ADDRESS
        ? previousAddress.customerAddressId
        : "";
    toast.error(checkoutErrorMessage(error), {
      id: SAVED_ADDRESS_TOAST_ID,
    });
  }
}

function geolocationErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    if (error.code === 1)
      return "Không thể truy cập vị trí. Vui lòng cấp quyền hoặc chọn địa chỉ đã lưu.";
    if (error.code === 3)
      return "Không thể xác định vị trí trong thời gian cho phép. Vui lòng thử lại.";
  }
  return "Thiết bị hiện không cung cấp được vị trí. Vui lòng chọn địa chỉ khác.";
}

async function locateMe(): Promise<void> {
  if (!navigator.geolocation) {
    toast.error(
      "Thiết bị hiện không cung cấp được vị trí. Vui lòng chọn địa chỉ khác.",
      { id: LOCATION_TOAST_ID },
    );
    return;
  }
  if (globalThis.isSecureContext === false) {
    toast.error(
      "Không thể truy cập vị trí trên kết nối không an toàn. Vui lòng chọn địa chỉ đã lưu.",
      { id: LOCATION_TOAST_ID },
    );
    return;
  }
  locationController?.abort();
  locationForm.locationProof = "";
  const controller = new AbortController();
  locationController = controller;
  isLocating.value = true;
  locationError.value = null;
  toast.loading("Đang lấy vị trí hiện tại của bạn...", {
    id: LOCATION_TOAST_ID,
  });
  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12_000,
          maximumAge: 30_000,
        });
      },
    );
    if (controller.signal.aborted) return;
    const coordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    const accuracyMeters = Math.max(0, Math.round(position.coords.accuracy));
    toast.loading("Đã xác định vị trí. Đang chuẩn hóa địa chỉ...", {
      id: LOCATION_TOAST_ID,
    });
    const suggestion = await reverseCheckoutLocation(
      coordinate,
      controller.signal,
    );
    if (controller.signal.aborted) return;
    isApplyingVerifiedLocation = true;
    try {
      Object.assign(locationForm, coordinate, {
        receiverName: draft.value?.address.receiverName ?? "",
        receiverPhone: draft.value?.address.receiverPhone ?? "",
        addressLine: suggestion.address,
        provinceName: suggestion.province ?? "",
        provinceCode: suggestion.provinceCode ?? 0,
        wardName: suggestion.ward ?? "",
        locationAccuracyMeters: accuracyMeters,
        locationPlaceId: suggestion.placeId ?? undefined,
        locationProof: suggestion.locationProof,
      });
    } finally {
      isApplyingVerifiedLocation = false;
    }
    detectedDisplayAddress.value = suggestion.displayAddress;
    showCurrentLocation.value = true;
    pendingSavedAddressId.value = "";
    toast.success(
      "Đã tìm thấy địa chỉ gần vị trí hiện tại. Vui lòng kiểm tra lại.",
      { id: LOCATION_TOAST_ID },
    );
  } catch (error: unknown) {
    if (controller.signal.aborted || isCanceledRequest(error)) return;
    const message = axios.isAxiosError(error)
      ? "Không thể tra cứu địa chỉ từ vị trí hiện tại. Vui lòng thử lại."
      : geolocationErrorMessage(error);
    locationError.value = message;
    toast.error(message, { id: LOCATION_TOAST_ID });
  } finally {
    if (locationController === controller) isLocating.value = false;
  }
}

async function confirmLocation(): Promise<void> {
  if (
    locationForm.receiverName.trim().length < 2 ||
    !/^(?:0\d{9}|\+84\d{9})$/.test(locationForm.receiverPhone.trim()) ||
    locationForm.addressLine.trim().length < 5 ||
    !locationForm.provinceName.trim() ||
    !Number.isInteger(locationForm.provinceCode) ||
    locationForm.provinceCode <= 0 ||
    !locationForm.wardName.trim() ||
    !locationForm.locationProof
  ) {
    locationError.value =
      "Vui lòng kiểm tra người nhận, số điện thoại và đầy đủ địa chỉ hành chính.";
    return;
  }
  locationController?.abort();
  const controller = new AbortController();
  locationController = controller;
  isResolvingLocation.value = true;
  locationError.value = null;
  toast.loading("Đang tính phí vận chuyển...", {
    id: LOCATION_TOAST_ID,
  });
  try {
    addressInput.value = { ...locationForm };
    await refreshPreview();
    showCurrentLocation.value = false;
    toast.success("Đã áp dụng địa chỉ giao hàng.", {
      id: LOCATION_TOAST_ID,
    });
  } catch (error: unknown) {
    if (controller.signal.aborted || isCanceledRequest(error)) return;
    const message = checkoutErrorMessage(error);
    if (checkoutErrorCode(error)?.startsWith("CHECKOUT_LOCATION_PROOF_")) {
      locationForm.locationProof = "";
    }
    locationError.value = message;
    toast.error(message, { id: LOCATION_TOAST_ID });
  } finally {
    if (locationController === controller) isResolvingLocation.value = false;
  }
}

function cancelDetectedLocation(): void {
  locationController?.abort();
  showCurrentLocation.value = false;
  detectedDisplayAddress.value = "";
  locationError.value = null;
  locationForm.locationProof = "";
}

async function changePaymentMethod(value: string): Promise<void> {
  if (
    value !== PreviewCheckoutDtoPaymentMethod.COD &&
    value !== PreviewCheckoutDtoPaymentMethod.VNPAY
  ) {
    return;
  }
  if (paymentMethod.value === value) return;
  paymentMethod.value = value;
  if (!addressInput.value) return;
  try {
    await refreshPreview();
  } catch (error: unknown) {
    if (isCanceledRequest(error)) return;
    toast.error(checkoutErrorMessage(error));
  }
}

async function placeOrder(): Promise<void> {
  if (!draft.value?.canPlaceOrder || !addressInput.value || isBusy.value) {
    return;
  }
  isMutating.value = true;
  const requestedBranchName =
    branchStore.selectedBranch?.name ?? "chi nhánh đã chọn";
  try {
    const previewReference = draft.value.previewReference;
    const idempotencyKey =
      placeOrderIdempotencyKeys.get(previewReference) ?? crypto.randomUUID();
    placeOrderIdempotencyKeys.set(previewReference, idempotencyKey);
    const payload: PlaceOrderDto = {
      ...requestPayload(),
      address: addressInput.value,
      paymentMethod: paymentMethod.value,
      previewReference,
      idempotencyKey,
    };
    if (paymentMethod.value === PreviewCheckoutDtoPaymentMethod.COD) {
      const order = await placeCodOrder(payload);
      await synchronizeCheckoutState(true, "CLEAR_AFTER_COD");
      await router.replace({
        name: "client-checkout-success",
        params: { orderId: order.orderId },
      });
      return;
    }
    const payment = await placeVnpayOrder(payload);
    window.location.assign(payment.paymentUrl);
  } catch (error: unknown) {
    if (isAllItemsInvalidError(error)) {
      await redirectAllInvalid(requestedBranchName);
      return;
    }
    if (checkoutErrorCode(error) === "CHECKOUT_PREVIEW_CHANGED") {
      toast.warning(
        "Giá, phí vận chuyển hoặc tồn kho đã thay đổi. Vui lòng kiểm tra và xác nhận lại.",
        { id: "checkout-preview-changed" },
      );
      await refreshPreview();
      return;
    }
    if (checkoutErrorCode(error)?.startsWith("CHECKOUT_LOCATION_PROOF_")) {
      locationForm.locationProof = "";
      addressInput.value = null;
      showCurrentLocation.value = true;
    }
    toast.error(
      checkoutErrorMessage(error) ||
        "Không thể đặt hàng. Giá, phí vận chuyển hoặc tồn kho có thể vừa thay đổi.",
    );
    await loadPreview();
  } finally {
    isMutating.value = false;
  }
}

watch(
  () => [
    locationForm.provinceCode,
    locationForm.provinceName,
    locationForm.wardName,
    locationForm.latitude,
    locationForm.longitude,
  ],
  () => {
    if (!isApplyingVerifiedLocation) locationForm.locationProof = "";
  },
  { flush: "sync" },
);

watch(
  () => branchStore.selectedBranchId,
  async (nextBranchId, previousBranchId) => {
    if (
      !draft.value ||
      !previousBranchId ||
      !nextBranchId ||
      nextBranchId === previousBranchId
    ) {
      return;
    }
    try {
      await refreshPreview();
    } catch (error: unknown) {
      if (isCanceledRequest(error)) return;
      if (isAllItemsInvalidError(error)) {
        if (nextBranchId !== branchStore.selectedBranchId) return;
        await redirectAllInvalid(
          branchStore.selectedBranch?.name ?? "chi nhánh đã chọn",
        );
        return;
      }
      toast.error(checkoutErrorMessage(error));
      await router.replace({ name: "client-cart" });
    }
  },
);

async function handleRemoteInventoryInvalidation(
  context: InventoryInvalidationContext,
): Promise<void> {
  if (
    !draft.value ||
    !addressInput.value ||
    (context.branchId && context.branchId !== branchStore.selectedBranchId)
  ) {
    return;
  }
  try {
    await refreshPreview();
  } catch (error: unknown) {
    if (isCanceledRequest(error)) return;
    if (isAllItemsInvalidError(error)) {
      await redirectAllInvalid(
        branchStore.selectedBranch?.name ?? "chi nhánh đã chọn",
      );
      return;
    }
    toast.error(checkoutErrorMessage(error));
  }
}

let stopInventorySubscription: () => void = () => {};
onMounted(() => {
  stopInventorySubscription = subscribeInventoryInvalidation((context) => {
    void handleRemoteInventoryInvalidation(context);
  });
  void loadPreview();
});
onBeforeUnmount(() => {
  previewController?.abort();
  locationController?.abort();
  stopInventorySubscription();
});
</script>

<template>
  <div class="w-full min-w-0 bg-slate-50/60 py-2 sm:py-3">
    <div class="w-full">
      <nav
        aria-label="Breadcrumb"
        class="mb-5 flex items-center gap-2 text-sm text-[var(--bookora-muted)]"
      >
        <RouterLink to="/" aria-label="Trang chủ">
          <Home class="size-4 text-[var(--bookora-green)]" />
        </RouterLink>
        <span>/</span>
        <RouterLink to="/cart" class="hover:text-[var(--bookora-green)]">
          Giỏ hàng
        </RouterLink>
        <span>/</span>
        <span aria-current="page" class="font-medium text-slate-900"
          >Thanh toán</span
        >
      </nav>
      <h1 class="text-3xl font-bold tracking-tight text-slate-950">
        Thanh toán
      </h1>

      <div
        class="mt-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/70 px-4 py-3 text-sm text-green-800"
      >
        <ShieldCheck class="size-5 shrink-0" />
        Thông tin của bạn được bảo mật và chỉ dùng để xử lý đơn hàng.
      </div>

      <div v-if="isLoading" class="mt-6 grid gap-5 lg:grid-cols-[1.5fr_0.9fr]">
        <Skeleton class="h-[720px] rounded-2xl" />
        <Skeleton class="h-[620px] rounded-2xl" />
      </div>

      <div
        v-else-if="draft"
        class="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]"
      >
        <main class="space-y-5">
          <section class="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 class="flex items-center gap-3 text-lg font-bold">
              <span
                class="grid size-7 place-items-center rounded-full bg-[var(--bookora-green)] text-sm text-white"
                >1</span
              >
              Địa chỉ giao hàng
            </h2>
            <label class="mt-5 block text-sm font-medium">Chọn địa chỉ</label>
            <div class="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <CheckoutAddressCombobox
                :addresses="addressesQuery.data.value ?? []"
                :selected-id="selectedAddressId"
                :disabled="isPreviewPending || isMutating"
                :loading="addressesQuery.isPending.value"
                :error="addressesQuery.isError.value"
                @select="chooseSavedAddress"
                @retry="addressesQuery.refetch()"
              />
              <Button
                variant="outline"
                type="button"
                :disabled="isBusy"
                @click="locateMe"
              >
                <LoaderCircle v-if="isLocating" class="size-4 animate-spin" />
                <MapPin v-else class="size-4" />
                Dùng vị trí hiện tại
              </Button>
            </div>

            <div
              v-if="draft.address.formattedAddress"
              class="mt-4 flex gap-3 rounded-xl border bg-slate-50 p-4"
            >
              <MapPin
                class="mt-0.5 size-5 shrink-0 text-[var(--bookora-green)]"
              />
              <div class="min-w-0 text-sm">
                <div class="flex flex-wrap items-center gap-2">
                  <strong>{{ draft.address.receiverName }}</strong>
                  <span class="text-slate-500">{{
                    draft.address.receiverPhone
                  }}</span>
                  <span
                    v-if="draft.address.source === 'SAVED_ADDRESS'"
                    class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700"
                    >Đã lưu</span
                  >
                </div>
                <p class="mt-1 leading-6 text-slate-600">
                  {{ draft.address.formattedAddress }}
                </p>
              </div>
            </div>

            <div
              v-if="showCurrentLocation"
              class="mt-4 rounded-xl border border-green-200 bg-green-50/40 p-4"
            >
              <div class="flex gap-3">
                <MapPin
                  class="mt-0.5 size-5 shrink-0 text-[var(--bookora-green)]"
                />
                <div class="min-w-0">
                  <strong class="block">Địa chỉ được phát hiện</strong>
                  <p class="mt-1 break-words text-sm leading-6 text-slate-600">
                    {{ detectedDisplayAddress }}
                  </p>
                  <p
                    v-if="locationForm.locationAccuracyMeters !== undefined"
                    class="mt-1 text-xs text-slate-500"
                  >
                    Độ chính xác: {{ locationForm.locationAccuracyMeters }} m
                  </p>
                </div>
              </div>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label for="checkout-location-receiver">Người nhận</Label>
                  <Input
                    id="checkout-location-receiver"
                    v-model="locationForm.receiverName"
                    class="mt-1.5"
                    placeholder="Người nhận"
                    @update:model-value="locationError = null"
                  />
                </div>
                <div>
                  <Label for="checkout-location-phone">Số điện thoại</Label>
                  <Input
                    id="checkout-location-phone"
                    v-model="locationForm.receiverPhone"
                    class="mt-1.5"
                    placeholder="Số điện thoại"
                    @update:model-value="locationError = null"
                  />
                </div>
                <div class="sm:col-span-2">
                  <Label for="checkout-location-line">Địa chỉ chi tiết</Label>
                  <Input
                    id="checkout-location-line"
                    v-model="locationForm.addressLine"
                    class="mt-1.5"
                    placeholder="Số nhà, tên đường"
                    @update:model-value="locationError = null"
                  />
                </div>
                <div>
                  <Label for="checkout-location-province">Tỉnh/Thành phố</Label>
                  <Input
                    id="checkout-location-province"
                    v-model="locationForm.provinceName"
                    class="mt-1.5"
                    @update:model-value="locationError = null"
                  />
                </div>
                <div>
                  <Label for="checkout-location-ward">Phường/Xã</Label>
                  <Input
                    id="checkout-location-ward"
                    v-model="locationForm.wardName"
                    class="mt-1.5"
                    @update:model-value="locationError = null"
                  />
                </div>
              </div>
              <p
                v-if="locationError"
                role="alert"
                class="mt-3 text-sm text-red-700"
              >
                {{ locationError }}
              </p>
              <div
                class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
              >
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isResolvingLocation"
                  @click="cancelDetectedLocation"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  :disabled="isResolvingLocation"
                  @click="confirmLocation"
                >
                  <LoaderCircle
                    v-if="isResolvingLocation"
                    class="size-4 animate-spin"
                  />
                  <Check v-else class="size-4" />
                  Áp dụng địa chỉ
                </Button>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 class="flex items-center gap-3 text-lg font-bold">
              <span
                class="grid size-7 place-items-center rounded-full bg-[var(--bookora-green)] text-sm text-white"
                >2</span
              >
              Phương thức vận chuyển
            </h2>
            <div class="mt-5 rounded-xl border p-4">
              <p class="border-b pb-4 text-sm font-semibold">
                Giao hàng tiêu chuẩn
              </p>
              <div class="grid gap-4 py-4 text-sm sm:grid-cols-[1fr_auto_1fr]">
                <div>
                  <strong>Địa chỉ gửi (Từ)</strong>
                  <p class="mt-1 leading-6 text-slate-600">
                    {{ draft.branch.name }} — {{ draft.branch.address }}
                  </p>
                </div>
                <Truck class="self-center text-slate-400" />
                <div>
                  <strong>Địa chỉ nhận (Đến)</strong>
                  <p class="mt-1 leading-6 text-slate-600">
                    {{ draft.address.formattedAddress || "Chưa chọn địa chỉ" }}
                  </p>
                </div>
              </div>
              <div
                class="flex w-full items-center justify-between rounded-xl border border-green-200 bg-green-50/50 p-4 text-left"
              >
                <span class="flex items-center gap-3">
                  <span
                    class="grid size-5 place-items-center rounded-full border-2 border-green-600"
                    ><span class="size-2.5 rounded-full bg-green-600"
                  /></span>
                  <span>
                    <strong class="block">Giao hàng tiêu chuẩn</strong>
                    <small class="text-slate-500">
                      Phí vận chuyển cố định theo khu vực giao hàng
                    </small>
                  </span>
                </span>
                <strong>{{
                  draft.shippingQuote ? formatPrice(draft.shippingFee) : "—"
                }}</strong>
              </div>
              <p v-if="!addressInput" class="mt-3 text-sm text-slate-500">
                Chọn địa chỉ để tính phí vận chuyển.
              </p>
            </div>
          </section>

          <section class="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
            <h2 class="flex items-center gap-3 text-lg font-bold">
              <span
                class="grid size-7 place-items-center rounded-full bg-[var(--bookora-green)] text-sm text-white"
                >3</span
              >
              Ghi chú đơn hàng
              <span class="font-normal text-slate-400">(không bắt buộc)</span>
            </h2>
            <Textarea
              v-model="note"
              maxlength="200"
              class="mt-5 min-h-28"
              placeholder="Ví dụ: Giao hàng giờ hành chính, gọi trước khi giao..."
            />
            <p class="mt-1 text-right text-xs text-slate-400">
              {{ note.length }}/200
            </p>
          </section>
        </main>

        <aside class="space-y-5 lg:sticky lg:top-5">
          <section class="rounded-2xl border bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold">
                <template v-if="invalidItems.length">
                  Đơn hàng ({{ eligibleItems.length }}/{{ draft.items.length }}
                  sản phẩm khả dụng)
                </template>
                <template v-else>
                  Đơn hàng ({{ draft.items.length }} sản phẩm)
                </template>
              </h2>
              <RouterLink to="/cart" class="text-sm text-green-700"
                >Chỉnh sửa</RouterLink
              >
            </div>
            <ul class="mt-4 space-y-4">
              <li
                v-for="item in draft.items"
                :key="item.id"
                class="grid grid-cols-[56px_1fr_auto] gap-3"
                :class="{ 'opacity-65': !item.eligible }"
              >
                <img
                  v-if="item.imageUrl"
                  :src="item.imageUrl"
                  :alt="item.productName"
                  class="h-20 w-14 rounded border object-cover"
                  :class="{ 'grayscale-[60%]': !item.eligible }"
                />
                <div
                  v-else
                  class="grid h-20 w-14 place-items-center rounded bg-slate-100"
                >
                  <PackageCheck class="size-5 text-slate-400" />
                </div>
                <div class="min-w-0 text-sm">
                  <strong class="line-clamp-2">{{ item.productName }}</strong>
                  <p class="mt-1 text-slate-500">{{ item.variantLabel }}</p>
                  <p class="text-slate-500">Số lượng: {{ item.quantity }}</p>
                  <template v-if="!item.eligible">
                    <span
                      class="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      Không khả dụng
                    </span>
                    <p class="mt-1 text-xs font-medium text-red-700">
                      {{ checkoutItemReasonMessage(item) }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      Không được tính vào đơn hàng
                    </p>
                  </template>
                </div>
                <strong
                  class="text-sm"
                  :class="{ 'text-slate-400 line-through': !item.eligible }"
                >
                  {{ formatPrice(item.lineTotal) }}
                </strong>
              </li>
            </ul>
            <div class="mt-5 space-y-3 border-t pt-4 text-sm">
              <div class="flex justify-between">
                <span>Tạm tính</span
                ><span>{{ formatPrice(draft.subtotalAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Phí vận chuyển</span
                ><span>{{ formatPrice(draft.shippingFee) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Giảm giá</span
                ><span>- {{ formatPrice(draft.discountAmount) }}</span>
              </div>
              <div class="flex justify-between border-t pt-4 text-lg">
                <strong>Tổng thanh toán</strong>
                <strong class="text-green-700">{{
                  formatPrice(draft.totalAmount)
                }}</strong>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 class="flex items-center gap-3 text-lg font-bold">
              <span
                class="grid size-7 place-items-center rounded-full bg-[var(--bookora-green)] text-sm text-white"
                >4</span
              >
              Phương thức thanh toán
            </h2>
            <RadioGroup
              :model-value="paymentMethod"
              class="mt-4"
              :disabled="isBusy"
              @update:model-value="changePaymentMethod(String($event))"
            >
              <Label
                for="payment-cod"
                class="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors"
                :class="
                  paymentMethod === 'COD'
                    ? 'border-green-300 bg-green-50/60'
                    : 'hover:border-slate-300'
                "
              >
                <RadioGroupItem id="payment-cod" value="COD" />
                <WalletCards class="size-6 shrink-0 text-green-700" />
                <span>
                  <strong class="block">Thanh toán COD</strong>
                  <small class="text-slate-600">Thanh toán khi nhận hàng</small>
                </span>
              </Label>
              <Label
                for="payment-vnpay"
                class="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors"
                :class="
                  paymentMethod === 'VNPAY'
                    ? 'border-green-300 bg-green-50/60'
                    : 'hover:border-slate-300'
                "
              >
                <RadioGroupItem id="payment-vnpay" value="VNPAY" />
                <img
                  src="/Icon-VNPAY-QR.webp"
                  alt="VNPAY"
                  class="h-8 w-20 shrink-0 object-contain"
                />
                <span>
                  <strong class="block">Thanh toán trực tuyến</strong>
                  <small class="text-slate-600">
                    ATM, tài khoản ngân hàng, ví điện tử
                  </small>
                </span>
              </Label>
            </RadioGroup>
            <div
              v-if="isPreviewPending"
              class="mt-4 flex items-center justify-center gap-2 rounded-lg border bg-slate-50 p-3 text-sm text-slate-600"
            >
              <LoaderCircle class="size-4 animate-spin" />
              Đang cập nhật phí theo phương thức thanh toán...
            </div>
            <div
              class="mt-4 flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs leading-5 text-green-800"
            >
              <ShieldCheck class="size-5 shrink-0" />
              Thông tin thanh toán được bảo mật và không lưu trữ bởi Bookora.
            </div>
            <Button
              type="button"
              class="mt-4 h-12 w-full bg-[var(--bookora-green)] text-base text-white"
              :disabled="Boolean(placeOrderBlocker) || isBusy"
              @click="placeOrder"
            >
              <LoaderCircle v-if="isMutating" class="size-4 animate-spin" />
              <LockKeyhole v-else class="size-4" />
              Đặt hàng
            </Button>
            <p
              v-if="placeOrderBlocker"
              class="mt-2 text-center text-xs leading-5 text-slate-500"
            >
              {{ placeOrderBlocker }}
            </p>
            <p class="mt-3 text-center text-xs leading-5 text-slate-500">
              Khi nhấn “Đặt hàng”, bạn đồng ý với điều khoản sử dụng và chính
              sách bảo mật.
            </p>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>
