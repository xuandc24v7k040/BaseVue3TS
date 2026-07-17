import { describe, expect, it } from "vitest";
import type { Permission } from "../types";
import {
  permissionToForm,
  toCreatePermissionPayload,
  toUpdatePermissionPayload,
} from "./permission-form.adapter";

const original = {
  id: "01J00000000000000000000000",
  code: "reports.read",
  name: "Xem báo cáo",
  resource: "reports",
  action: "read",
  guardName: "web" as const,
  description: "Mô tả cũ",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies Permission;

describe("permission form adapter", () => {
  it("creates an allowlisted payload and normalizes an empty description to null", () => {
    const payload = toCreatePermissionPayload({
      code: "reports.export",
      name: "Xuất báo cáo",
      resource: "reports",
      action: "export",
      guardName: "web",
      description: "",
    });

    expect(payload).toEqual({
      code: "reports.export",
      name: "Xuất báo cáo",
      resource: "reports",
      action: "export",
      guardName: "web",
      description: null,
    });
  });

  it("preserves a non-empty create description", () => {
    expect(
      toCreatePermissionPayload({
        code: "reports.export",
        name: "Xuất báo cáo",
        resource: "reports",
        action: "export",
        guardName: "web",
        description: "Cho phép xuất dữ liệu báo cáo",
      }),
    ).toMatchObject({ description: "Cho phép xuất dữ liệu báo cáo" });
  });

  it("sends description-only updates, including clearing the description", () => {
    expect(
      toUpdatePermissionPayload(
        { ...original, description: "Mô tả mới" },
        original,
      ),
    ).toEqual({ description: "Mô tả mới" });
    expect(
      toUpdatePermissionPayload({ ...original, description: "" }, original),
    ).toEqual({ description: null });
  });

  it("prefills only full-form fields from an API response", () => {
    expect(permissionToForm(original)).toEqual({
      code: "reports.read",
      name: "Xem báo cáo",
      resource: "reports",
      action: "read",
      guardName: "web",
      description: "Mô tả cũ",
    });
  });
});
