import type {
  CreateStockReceiptDto,
  AdjustInventoryQuantityDto,
  InventoryGroupedStocksListParams,
  InventoryMovementsListParams,
  InventoryStocksListParams,
  InventoryVariantOptionsParams,
  StockReceiptsListParams,
  UpdateLowStockThresholdDto,
  UpdateStockReceiptDraftDto,
} from "@/api/generated/models";
import {
  inventoryGroupedStocksList,
  inventoryMovementsList,
  inventoryStocksAdjustQuantity,
  inventoryStocksList,
  inventoryStocksUpdateThreshold,
  inventoryVariantOptions,
} from "@/api/generated/endpoints/inventory/inventory";
import {
  stockReceiptsCancel,
  stockReceiptsConfirm,
  stockReceiptsCreate,
  stockReceiptsGet,
  stockReceiptsList,
  stockReceiptsUpdate,
} from "@/api/generated/endpoints/stock-receipts/stock-receipts";

const branchScopedRequest = { branchScoped: true } as const;

export const listVariantOptions = (
  params: InventoryVariantOptionsParams,
  signal?: AbortSignal,
  branchScoped = false,
) =>
  inventoryVariantOptions(
    params,
    branchScoped ? branchScopedRequest : undefined,
    signal,
  );

export const listStocks = (
  params: InventoryStocksListParams,
  signal?: AbortSignal,
) => inventoryStocksList(params, branchScopedRequest, signal);

export const listGroupedStocks = (
  params: InventoryGroupedStocksListParams,
  signal?: AbortSignal,
) => inventoryGroupedStocksList(params, branchScopedRequest, signal);

export const listInventoryMovements = (
  params: InventoryMovementsListParams,
  signal?: AbortSignal,
) => inventoryMovementsList(params, branchScopedRequest, signal);

export const adjustStockQuantity = (
  variantId: string,
  payload: AdjustInventoryQuantityDto,
) => inventoryStocksAdjustQuantity(variantId, payload, branchScopedRequest);

export const updateStockThreshold = (
  variantId: string,
  payload: UpdateLowStockThresholdDto,
) => inventoryStocksUpdateThreshold(variantId, payload, branchScopedRequest);

export const listStockReceipts = (
  params: StockReceiptsListParams,
  signal?: AbortSignal,
) => stockReceiptsList(params, branchScopedRequest, signal);

export const getStockReceipt = (id: string, signal?: AbortSignal) =>
  stockReceiptsGet(id, branchScopedRequest, signal).then(
    (response) => response.data,
  );

export const createStockReceipt = (payload: CreateStockReceiptDto) =>
  stockReceiptsCreate(payload, branchScopedRequest).then(
    (response) => response.data,
  );

export const updateStockReceipt = (
  id: string,
  payload: UpdateStockReceiptDraftDto,
) =>
  stockReceiptsUpdate(id, payload, branchScopedRequest).then(
    (response) => response.data,
  );

export const cancelStockReceipt = (id: string) =>
  stockReceiptsCancel(id, branchScopedRequest);

export const confirmStockReceipt = (id: string) =>
  stockReceiptsConfirm(id, branchScopedRequest);
