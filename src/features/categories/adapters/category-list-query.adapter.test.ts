import { describe, expect, it } from "vitest";
import { toCategoryTreeParams } from "./category-list-query.adapter";

describe("toCategoryTreeParams", () => {
  it("maps search, filters and sorting to the OpenAPI query contract", () => {
    expect(
      toCategoryTreeParams({
        page: 1,
        pageSize: 100,
        search: { value: "văn học", columnIds: ["name"] },
        filters: [
          { id: "type", value: ["NORMAL"], operator: "in" },
          { id: "level", value: ["2"], operator: "in" },
          { id: "isActive", value: ["false"], operator: "in" },
        ],
        sort: [{ id: "name", desc: true }],
      }),
    ).toEqual({
      search: "văn học",
      type: "NORMAL",
      level: 2,
      isActive: false,
      sortBy: "name",
      sortOrder: "desc",
    });
  });

  it("uses deterministic default ordering", () => {
    expect(toCategoryTreeParams({ page: 1, pageSize: 100 })).toEqual({
      sortBy: "sortOrder",
      sortOrder: "asc",
    });
  });
});
