import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  candidates: vi.fn(),
  assignExisting: vi.fn(),
  assignments: vi.fn(),
  assignableRoles: vi.fn(),
  assignablePermissions: vi.fn(),
  roleList: vi.fn(),
  roleGet: vi.fn(),
  permissionList: vi.fn(),
  activateBranch: vi.fn(),
  deactivateBranch: vi.fn(),
  removeBranch: vi.fn(),
  primary: vi.fn(),
  transfer: vi.fn(),
  assignRole: vi.fn(),
  removeRole: vi.fn(),
  permission: vi.fn(),
  removePermission: vi.fn(),
  userActivate: vi.fn(),
  branchesList: vi.fn(),
}));
vi.mock("@/api/generated/endpoints/roles/roles", () => ({
  rolesList: mocks.roleList,
  rolesGet: mocks.roleGet,
}));
vi.mock("@/api/generated/endpoints/permissions/permissions", () => ({
  permissionsList: mocks.permissionList,
}));
vi.mock("@/api/generated/endpoints/users/users", () => ({
  usersActivate: mocks.userActivate,
}));
vi.mock("@/api/generated/endpoints/branches/branches", () => ({
  branchesList: mocks.branchesList,
}));
vi.mock("@/api/generated/endpoints/staff/staff", () => ({
  staffList: mocks.list,
  staffGet: mocks.get,
  staffCreate: mocks.create,
  staffCandidates: mocks.candidates,
  staffAssignExisting: mocks.assignExisting,
  staffAssignments: mocks.assignments,
  staffAssignableRoles: mocks.assignableRoles,
  staffAssignablePermissions: mocks.assignablePermissions,
  staffActivateBranch: mocks.activateBranch,
  staffDeactivateBranch: mocks.deactivateBranch,
  staffRemoveBranch: mocks.removeBranch,
  staffPrimary: mocks.primary,
  staffTransferBranch: mocks.transfer,
  staffAssignRole: mocks.assignRole,
  staffRemoveRole: mocks.removeRole,
  staffPermission: mocks.permission,
  staffRemovePermission: mocks.removePermission,
}));

import {
  assignExistingStaff,
  createStaff,
  getStaff,
  getStaffGlobalAssignments,
  listStaff,
  listStaffCandidates,
  listStaffPermissionCatalog,
  listAssignableStaffRoles,
  listStaffRoleCatalog,
  getStaffRoleDetail,
  activateStaffAssignment,
  deactivateStaffAssignment,
  removeStaffAssignment,
  setStaffPrimary,
  transferStaff,
  assignStaffRole,
  upsertStaffPermission,
  activateStaffAccount,
} from "./staff-api";

describe("Staff API wrapper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks only selected-branch operations as branch scoped", async () => {
    const listParams = { page: 1, limit: 10 };
    const candidateParams = { page: 1, limit: 10, search: "admin" };
    const createPayload = {
      fullName: "Staff",
      email: "staff@example.com",
      password: "password@123",
      roleIds: ["role-id"],
    };
    const assignPayload = { roleIds: ["role-id"] };

    await listStaff(listParams);
    await getStaff("staff-id");
    await createStaff(createPayload);
    await listStaffCandidates(candidateParams);
    await assignExistingStaff("staff-id", assignPayload);
    await getStaffGlobalAssignments("staff-id");
    await listAssignableStaffRoles({
      page: 1,
      limit: 100,
      action: "ASSIGN",
    });
    await listStaffRoleCatalog({ page: 1, limit: 100 });
    await getStaffRoleDetail("role-id");
    await listStaffPermissionCatalog({ page: 1, limit: 100 });

    const scoped = { branchScoped: true };
    expect(mocks.list).toHaveBeenCalledWith(listParams, scoped, undefined);
    expect(mocks.get).toHaveBeenCalledWith("staff-id", scoped, undefined);
    expect(mocks.create).toHaveBeenCalledWith(createPayload, scoped);
    expect(mocks.candidates).toHaveBeenCalledWith(
      candidateParams,
      scoped,
      undefined,
    );
    expect(mocks.assignExisting).toHaveBeenCalledWith(
      "staff-id",
      assignPayload,
      scoped,
    );
    expect(mocks.assignments).toHaveBeenCalledWith(
      "staff-id",
      undefined,
      undefined,
    );
    expect(mocks.assignableRoles).toHaveBeenCalledWith(
      { page: 1, limit: 100, action: "ASSIGN" },
      scoped,
      undefined,
    );
    expect(mocks.roleList).toHaveBeenCalledWith(
      { page: 1, limit: 100 },
      scoped,
      undefined,
    );
    expect(mocks.roleGet).toHaveBeenCalledWith("role-id", scoped, undefined);
    expect(mocks.assignablePermissions).toHaveBeenCalledWith(
      { page: 1, limit: 100 },
      scoped,
      undefined,
    );
  });

  it("keeps lifecycle global and role/permission mutations branch scoped", async () => {
    await activateStaffAssignment("staff-id", "branch-id");
    await deactivateStaffAssignment("staff-id", "branch-id", {});
    await removeStaffAssignment("staff-id", "branch-id", {});
    await setStaffPrimary("staff-id", "branch-id");
    await transferStaff("staff-id", {
      fromBranchId: "a",
      toBranchId: "b",
      destinationRoleIds: ["role"],
    });
    await activateStaffAccount("staff-id");
    await assignStaffRole("staff-id", "role-id");
    await upsertStaffPermission("staff-id", "permission-id", {
      effect: "DENY",
    });

    expect(mocks.activateBranch).toHaveBeenCalledWith("staff-id", "branch-id");
    expect(mocks.deactivateBranch).toHaveBeenCalledWith(
      "staff-id",
      "branch-id",
      {},
    );
    expect(mocks.removeBranch).toHaveBeenCalledWith(
      "staff-id",
      "branch-id",
      {},
    );
    expect(mocks.primary).toHaveBeenCalledWith("staff-id", "branch-id");
    expect(mocks.transfer).toHaveBeenCalledWith("staff-id", {
      fromBranchId: "a",
      toBranchId: "b",
      destinationRoleIds: ["role"],
    });
    expect(mocks.userActivate).toHaveBeenCalledWith("staff-id");
    expect(mocks.assignRole).toHaveBeenCalledWith("staff-id", "role-id", {
      branchScoped: true,
    });
    expect(mocks.permission).toHaveBeenCalledWith(
      "staff-id",
      "permission-id",
      { effect: "DENY" },
      { branchScoped: true },
    );
  });
});
