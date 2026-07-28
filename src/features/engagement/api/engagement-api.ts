import {
  customerReviewsCreate,
  customerReviewsDelete,
  customerReviewsList,
  customerReviewsPending,
  customerReviewsUpdate,
} from "@/api/generated/endpoints/customer-reviews/customer-reviews";
import {
  customerWishlistAdd,
  customerWishlistList,
  customerWishlistRemove,
  customerWishlistStatus,
} from "@/api/generated/endpoints/customer-wishlist/customer-wishlist";
import { storefrontProductReviewsList } from "@/api/generated/endpoints/public-reviews/public-reviews";
import { customerAccountDashboard } from "@/api/generated/endpoints/customer-account/customer-account";
import type {
  CreateReviewDto,
  CustomerReviewsListParams,
  CustomerReviewsPendingParams,
  CustomerWishlistListParams,
  StorefrontProductReviewsListParams,
  UpdateReviewDto,
} from "@/api/generated/models";

export const engagementKeys = {
  all: ["engagement"] as const,
  wishlist: ["engagement", "wishlist"] as const,
  wishlistList: (params: CustomerWishlistListParams) =>
    ["engagement", "wishlist", params] as const,
  reviews: ["engagement", "reviews"] as const,
  mine: (params: CustomerReviewsListParams) =>
    ["engagement", "reviews", "mine", params] as const,
  pending: (params: CustomerReviewsPendingParams) =>
    ["engagement", "reviews", "pending", params] as const,
  public: (productId: string, params: StorefrontProductReviewsListParams) =>
    ["engagement", "reviews", "public", productId, params] as const,
  dashboard: ["engagement", "dashboard"] as const,
};

export async function listWishlist(
  params: CustomerWishlistListParams,
  signal?: AbortSignal,
) {
  return (await customerWishlistList(params, undefined, signal)).data;
}

export async function getWishlistStatus(
  productIds: string[],
  signal?: AbortSignal,
) {
  return (
    await customerWishlistStatus(
      { productIds },
      { paramsSerializer: { indexes: null } },
      signal,
    )
  ).data;
}

export async function setWishlist(productId: string, wished: boolean) {
  const response = wished
    ? await customerWishlistAdd(productId)
    : await customerWishlistRemove(productId);
  return response.data;
}

export async function listMyReviews(
  params: CustomerReviewsListParams,
  signal?: AbortSignal,
) {
  return (await customerReviewsList(params, undefined, signal)).data;
}

export async function listPendingReviews(
  params: CustomerReviewsPendingParams,
  signal?: AbortSignal,
) {
  return (await customerReviewsPending(params, undefined, signal)).data;
}

export async function listPublicReviews(
  productId: string,
  params: StorefrontProductReviewsListParams,
  signal?: AbortSignal,
) {
  return (
    await storefrontProductReviewsList(productId, params, undefined, signal)
  ).data;
}

export async function createReview(payload: CreateReviewDto) {
  return (await customerReviewsCreate(payload)).data;
}

export async function updateReview(reviewId: string, payload: UpdateReviewDto) {
  return (await customerReviewsUpdate(reviewId, payload)).data;
}

export async function deleteReview(reviewId: string) {
  return (await customerReviewsDelete(reviewId)).data;
}

export async function getAccountDashboard(signal?: AbortSignal) {
  return (await customerAccountDashboard(undefined, signal)).data;
}
