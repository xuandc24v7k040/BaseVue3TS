import { describe, expect, it } from "vitest";
import { toBranchAdminListParams } from "./branch-admin-list-query.adapter";

describe("toBranchAdminListParams", () => {
  it("composes search and all server filters", () => {
    expect(
      toBranchAdminListParams({
        page: 3,
        pageSize: 20,
        search: { value: "  An  ", columnIds: ["fullName"] },
        sort: [{ id: "fullName", desc: false }],
        filters: [
          { id: "isActive", operator: "in", value: ["false"] },
          { id: "assignmentState", operator: "in", value: ["INACTIVE_ONLY"] },
          { id: "assignedBranchId", operator: "in", value: ["branch-id"] },
        ],
      }),
    ).toEqual({
      page: 3,
      limit: 20,
      search: "An",
      isActive: false,
      assignmentState: "INACTIVE_ONLY",
      assignedBranchId: "branch-id",
      sortBy: "fullName",
      sortOrder: "asc",
    });
  });

  it("drops empty and invalid filter values", () => {
    expect(
      toBranchAdminListParams({
        page: 1,
        pageSize: 10,
        filters: [
          { id: "assignmentState", operator: "in", value: ["INVALID"] },
        ],
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  });

  it("falls back to the authoritative default for unsupported sort fields", () => {
    expect(
      toBranchAdminListParams({
        page: 2,
        pageSize: 20,
        sort: [{ id: "actions", desc: false }],
      }),
    ).toMatchObject({ sortBy: "createdAt", sortOrder: "desc" });
  });
});
