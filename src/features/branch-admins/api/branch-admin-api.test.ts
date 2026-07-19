import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  assign: vi.fn(),
  activateAssignment: vi.fn(),
  deactivateAssignment: vi.fn(),
  removeAssignment: vi.fn(),
  primary: vi.fn(),
  activateUser: vi.fn(),
}));

vi.mock("@/api/generated/endpoints/branch-admins/branch-admins", () => ({
  branchAdminsList: mocks.list,
  branchAdminsGet: mocks.get,
  branchAdminsCreate: mocks.create,
  branchAdminsAssignBranch: mocks.assign,
  branchAdminsActivateBranch: mocks.activateAssignment,
  branchAdminsDeactivateBranch: mocks.deactivateAssignment,
  branchAdminsRemoveBranch: mocks.removeAssignment,
  branchAdminsPrimary: mocks.primary,
}));

vi.mock("@/api/generated/endpoints/users/users", () => ({
  usersActivate: mocks.activateUser,
}));

import {
  assignBranchAdmin,
  activateBranchAdminAccount,
  activateBranchAdminAssignment,
  createBranchAdmin,
  deactivateBranchAdminAssignment,
  getBranchAdmin,
  listBranchAdmins,
  removeBranchAdminAssignment,
  setBranchAdminPrimary,
} from "./branch-admin-api";

describe("Branch Admin API wrapper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps all management requests global without X-Branch-Id", async () => {
    const params = {
      page: 2,
      limit: 10,
      search: "an",
      excludeAssignedBranchId: "branch-id",
    };
    const payload = {
      fullName: "Admin",
      email: "admin@example.com",
      password: "password@123",
      branchIds: ["branch-id"],
    };
    await listBranchAdmins(params);
    await getBranchAdmin("admin-id");
    await createBranchAdmin(payload);
    await assignBranchAdmin("admin-id", "branch-id");
    await activateBranchAdminAssignment("admin-id", "branch-id");
    await deactivateBranchAdminAssignment("admin-id", "branch-id", {
      replacementBranchId: "replacement-id",
    });
    await removeBranchAdminAssignment("admin-id", "branch-id", {});
    await setBranchAdminPrimary("admin-id", "branch-id");
    await activateBranchAdminAccount("admin-id");

    expect(mocks.list).toHaveBeenCalledWith(params, undefined, undefined);
    expect(mocks.get).toHaveBeenCalledWith("admin-id", undefined, undefined);
    expect(mocks.create).toHaveBeenCalledWith(payload);
    expect(mocks.assign).toHaveBeenCalledWith("admin-id", "branch-id");
    expect(mocks.activateAssignment).toHaveBeenCalledWith(
      "admin-id",
      "branch-id",
    );
    expect(mocks.deactivateAssignment).toHaveBeenCalledWith(
      "admin-id",
      "branch-id",
      { replacementBranchId: "replacement-id" },
    );
    expect(mocks.removeAssignment).toHaveBeenCalledWith(
      "admin-id",
      "branch-id",
      {},
    );
    expect(mocks.primary).toHaveBeenCalledWith("admin-id", "branch-id");
    expect(mocks.activateUser).toHaveBeenCalledWith("admin-id");
  });
});
