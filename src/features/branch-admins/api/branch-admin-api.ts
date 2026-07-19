import type {
  BranchAdminsListParams,
  ChangePrimaryBranchDto,
  CreateInternalUserDto,
} from "@/api/generated/models";
import {
  branchAdminsActivateBranch,
  branchAdminsAssignBranch,
  branchAdminsCreate,
  branchAdminsDeactivateBranch,
  branchAdminsGet,
  branchAdminsList,
  branchAdminsPrimary,
  branchAdminsRemoveBranch,
} from "@/api/generated/endpoints/branch-admins/branch-admins";
import { usersActivate } from "@/api/generated/endpoints/users/users";

export function listBranchAdmins(
  params: BranchAdminsListParams,
  signal?: AbortSignal,
) {
  return branchAdminsList(params, undefined, signal);
}

export function getBranchAdmin(id: string, signal?: AbortSignal) {
  return branchAdminsGet(id, undefined, signal);
}

export function createBranchAdmin(payload: CreateInternalUserDto) {
  return branchAdminsCreate(payload);
}

export function assignBranchAdmin(id: string, branchId: string) {
  return branchAdminsAssignBranch(id, branchId);
}

export function activateBranchAdminAssignment(id: string, branchId: string) {
  return branchAdminsActivateBranch(id, branchId);
}

export function deactivateBranchAdminAssignment(
  id: string,
  branchId: string,
  payload: ChangePrimaryBranchDto = {},
) {
  return branchAdminsDeactivateBranch(id, branchId, payload);
}

export function removeBranchAdminAssignment(
  id: string,
  branchId: string,
  payload: ChangePrimaryBranchDto = {},
) {
  return branchAdminsRemoveBranch(id, branchId, payload);
}

export function setBranchAdminPrimary(id: string, branchId: string) {
  return branchAdminsPrimary(id, branchId);
}

export function activateBranchAdminAccount(id: string) {
  return usersActivate(id);
}
