import type {
  CustomerOrderListResponseDto,
  CustomerOrderResponseDto,
  CustomerOrdersListParams,
} from "@/api/generated/models";
import {
  customerOrderCancel,
  customerOrderDetail,
  customerOrdersList,
} from "@/api/generated/endpoints/customer-orders/customer-orders";

export async function listCustomerOrders(
  params: CustomerOrdersListParams,
  signal?: AbortSignal,
): Promise<CustomerOrderListResponseDto> {
  return (
    await customerOrdersList(
      params,
      { paramsSerializer: { indexes: null } },
      signal,
    )
  ).data;
}

export const customerOrderKeys = {
  all: ["customer-orders"] as const,
  list: (params: CustomerOrdersListParams) =>
    [...customerOrderKeys.all, "list", params] as const,
  details: ["customer-order"] as const,
  detail: (orderId: string) =>
    [...customerOrderKeys.details, orderId] as const,
};

export async function getCustomerOrder(
  orderId: string,
  signal?: AbortSignal,
): Promise<CustomerOrderResponseDto> {
  return (await customerOrderDetail(orderId, undefined, signal)).data;
}

export async function cancelCustomerOrder(
  orderId: string,
  reason?: string,
): Promise<CustomerOrderResponseDto> {
  return (
    await customerOrderCancel(orderId, reason?.trim() ? { reason } : {})
  ).data;
}
