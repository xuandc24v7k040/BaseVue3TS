import { describe, expect, it } from "vitest";
import { createBranchColumns, formatBranchDateTime } from "./branch-columns";
import branchListPage from "../pages/BranchListPage.vue?raw";

describe("branch columns", () => {
  it("formats created time with a four-digit Vietnamese year and no seconds", () => {
    expect(formatBranchDateTime("2026-06-27T07:47:00.000Z")).toBe(
      "14:47 27/6/2026",
    );
  });

  it.each([null, undefined, "", "not-a-date"])(
    "uses a safe fallback for %s",
    (value) => {
      expect(formatBranchDateTime(value)).toBe("—");
    },
  );

  it("uses the formatter in the createdAt table column", () => {
    const createdAt = createBranchColumns().find(
      (column) => "accessorKey" in column && column.accessorKey === "createdAt",
    );
    expect(createdAt).toBeDefined();
  });

  it("hides code by default while retaining code search and visibility controls", () => {
    expect(branchListPage).toContain("initialColumnVisibility");
    expect(branchListPage).toContain("code: false");
    expect(branchListPage).toContain("enableColumnVisibility: true");
    expect(branchListPage).toContain("columnIds: ['code', 'name']");
  });
});
