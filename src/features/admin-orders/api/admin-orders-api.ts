import type {
  AdminOrderCancelDto,
  AdminOrderInternalNoteDto,
  AdminOrdersListParams,
  AdminOrderTransitionDto,
} from "@/api/generated/models";
import {
  adminOrdersCancel,
  adminOrdersDetail,
  adminOrdersList,
  adminOrdersTransition,
  adminOrdersUpdateInternalNote,
} from "@/api/generated/endpoints/admin-orders/admin-orders";

const branchScopedRequest = { branchScoped: true } as const;
const branchScopedListRequest = {
  ...branchScopedRequest,
  paramsSerializer: { indexes: null },
} as const;

export const listAdminOrders = (
  params: AdminOrdersListParams,
  signal?: AbortSignal,
) => adminOrdersList(params, branchScopedListRequest, signal);

export const getAdminOrder = (orderId: string, signal?: AbortSignal) =>
  adminOrdersDetail(orderId, branchScopedRequest, signal).then(
    (response) => response.data,
  );

export const transitionAdminOrder = (
  orderId: string,
  payload: AdminOrderTransitionDto,
) =>
  adminOrdersTransition(orderId, payload, branchScopedRequest).then(
    (response) => response.data,
  );

export const cancelAdminOrder = (
  orderId: string,
  payload: AdminOrderCancelDto,
) =>
  adminOrdersCancel(orderId, payload, branchScopedRequest).then(
    (response) => response.data,
  );

export const updateAdminOrderInternalNote = (
  orderId: string,
  payload: AdminOrderInternalNoteDto,
) =>
  adminOrdersUpdateInternalNote(orderId, payload, branchScopedRequest).then(
    (response) => response.data,
  );
