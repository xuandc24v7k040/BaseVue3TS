import type {
  RevenueBranchDto,
  RevenueTrendBucketDto,
} from "@/api/generated/models";

export type RevenueBranchSortOrder = "asc" | "desc";

export function sortRevenueBranches(
  branches: readonly RevenueBranchDto[],
  order: RevenueBranchSortOrder,
): RevenueBranchDto[] {
  return branches
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const difference =
        order === "desc"
          ? right.item.totalRevenue - left.item.totalRevenue
          : left.item.totalRevenue - right.item.totalRevenue;
      return difference || left.index - right.index;
    })
    .map(({ item }) => item);
}

export function selectTopRevenuePeriod(
  items: readonly RevenueTrendBucketDto[],
): RevenueTrendBucketDto | null {
  return items.reduce<RevenueTrendBucketDto | null>((best, item) => {
    if (!best || item.totalRevenue > best.totalRevenue) return item;
    if (item.totalRevenue === best.totalRevenue && item.key < best.key) {
      return item;
    }
    return best;
  }, null);
}

export function selectLeadingBranch(
  branches: readonly RevenueBranchDto[],
): RevenueBranchDto | null {
  return branches.reduce<RevenueBranchDto | null>(
    (best, item) =>
      !best ||
      item.totalRevenue > best.totalRevenue ||
      (item.totalRevenue === best.totalRevenue &&
        item.branchId < best.branchId)
        ? item
        : best,
    null,
  );
}
