import { describe, expect, it } from "vitest";
import listSource from "../pages/PermissionListPage.vue?raw";
import detailSource from "../pages/PermissionDetailPage.vue?raw";
import formSource from "./PermissionFormDialog.vue?raw";
import deleteSource from "./PermissionDeleteDialog.vue?raw";

describe("permission UI contract", () => {
  it("gates create, update and delete independently", () => {
    expect(listSource).toContain("ADMIN_PERMISSIONS.PERMISSIONS_CREATE");
    expect(listSource).toContain("ADMIN_PERMISSIONS.PERMISSIONS_UPDATE");
    expect(listSource).toContain("ADMIN_PERMISSIONS.PERMISSIONS_DELETE");
    expect(detailSource).toContain(':disabled="dangerous || totalUsage > 0"');
  });

  it("keeps the responsive form footer outside its ScrollArea", () => {
    expect(formSource).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(formSource.indexOf("</ScrollArea></div>")).toBeLessThan(
      formSource.indexOf("<DialogFooter"),
    );
    expect(formSource).toContain("max-h-[90dvh]");
    expect(formSource).toContain("flex-col-reverse");
  });

  it("shows inline server errors and focuses the first invalid field", () => {
    expect(formSource).toContain("formError");
    expect(formSource).toContain("focusFirstInvalidField");
    expect(formSource).toContain('scrollIntoView({ block: "nearest" })');
    expect(formSource).toContain("error.response?.data.errors");
  });

  it("fetches fresh detail before delete and handles a 409 race without optimistic removal", () => {
    expect(deleteSource).toContain("getPermission(props.permission!.id");
    expect(deleteSource).toContain(
      "if (status === 409) await detailQuery.refetch()",
    );
    expect(deleteSource).toContain("permissionKeys.lists()");
    expect(deleteSource).not.toMatch(/setQueryData|optimistic/i);
  });
});
