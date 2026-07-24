import type {
  CheckoutPreviewResponseDto,
  CheckoutReverseCurrentLocationParams,
  PaymentStatusResponseDto,
  PlaceOrderDto,
  PlaceOrderResponseDto,
  PreviewCheckoutDto,
  VnpayPlaceOrderResponseDto,
} from "@/api/generated/models";
import {
  checkoutPlaceOrderCod,
  checkoutPlaceOrderVnpay,
  checkoutPreview,
  checkoutReverseCurrentLocation,
} from "@/api/generated/endpoints/checkout/checkout";
import {
  paymentsRetry,
  paymentsStatus,
} from "@/api/generated/endpoints/payments/payments";

export async function previewCheckout(
  payload: PreviewCheckoutDto,
  signal?: AbortSignal,
): Promise<CheckoutPreviewResponseDto> {
  return (await checkoutPreview(payload, { branchScoped: true }, signal)).data;
}

export async function reverseCheckoutLocation(
  params: CheckoutReverseCurrentLocationParams,
  signal?: AbortSignal,
) {
  return (await checkoutReverseCurrentLocation(params, undefined, signal)).data;
}

export async function placeCodOrder(
  payload: PlaceOrderDto,
): Promise<PlaceOrderResponseDto> {
  return (await checkoutPlaceOrderCod(payload, { branchScoped: true })).data;
}

export async function placeVnpayOrder(
  payload: PlaceOrderDto,
): Promise<VnpayPlaceOrderResponseDto> {
  return (await checkoutPlaceOrderVnpay(payload, { branchScoped: true })).data;
}

export async function getPaymentStatus(
  paymentId: string,
  signal?: AbortSignal,
): Promise<PaymentStatusResponseDto> {
  return (await paymentsStatus(paymentId, undefined, signal)).data;
}

export async function retryVnpayPayment(paymentId: string) {
  return (
    await paymentsRetry(paymentId, {
      idempotencyKey: crypto.randomUUID(),
    })
  ).data;
}
