import { describe, expect, it } from "vitest";
import { toStaffListParams } from "./staff-list-query.adapter";

describe("Staff list query adapter", () => {
  it("maps URL-synced table search, sort and filters to the server contract", () => {
    expect(
      toStaffListParams({
        page: 2,
        pageSize: 20,
        search: { value: "  an  ", columnIds: ["fullName"] },
        sort: [{ id: "assignedAt", desc: false }],
        filters: [
          { id: "userIsActive", value: ["true"], operator: "in" },
          { id: "assignmentIsActive", value: ["false"], operator: "in" },
          { id: "isPrimary", value: ["true"], operator: "in" },
          { id: "roleId", value: ["role-id"], operator: "in" },
        ],
      }),
    ).toEqual({
      page: 2,
      limit: 20,
      search: "an",
      sortBy: "assignedAt",
      sortOrder: "asc",
      userIsActive: true,
      assignmentIsActive: false,
      isPrimary: true,
      roleId: "role-id",
    });
  });
});
