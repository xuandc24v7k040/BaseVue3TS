import { describe, expect, it } from "vitest";
import {
  collectInheritedPermissionIds,
  directPermissionIds,
  groupPermissionsByResource,
} from "./staff-access";

describe("Staff access configurator semantics", () => {
  it("counts unique inherited permissions across selected roles", () => {
    const inherited = collectInheritedPermissionIds([
      {
        rolePermissions: [
          { permission: { id: "orders.read" } },
          { permission: { id: "orders.create" } },
        ],
      },
      {
        rolePermissions: [{ permission: { id: "orders.read" } }],
      },
    ]);

    expect([...inherited]).toEqual(["orders.read", "orders.create"]);
  });

  it("keeps only unique direct permissions in mutation payloads", () => {
    expect(
      directPermissionIds(
        ["orders.read", "orders.refund", "orders.refund"],
        new Set(["orders.read"]),
      ),
    ).toEqual(["orders.refund"]);
  });

  it("groups permission search results by resource", () => {
    expect(
      groupPermissionsByResource([
        { id: "2", resource: "staff" },
        { id: "1", resource: "orders" },
      ]),
    ).toEqual([
      ["orders", [{ id: "1", resource: "orders" }]],
      ["staff", [{ id: "2", resource: "staff" }]],
    ]);
  });
});
