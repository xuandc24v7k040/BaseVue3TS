import type {
  AssignExistingStaffDto,
  ChangePrimaryBranchDto,
  CreateStaffDto,
  StaffAssignablePermissionsParams,
  RolesListParams,
  StaffCandidatesParams,
  StaffAssignableRolesParams,
  StaffListParams,
  TransferStaffBranchDto,
  UpsertUserPermissionDto,
} from "@/api/generated/models";
import {
  staffActivateBranch,
  staffAssignablePermissions,
  staffAssignableRoles,
  staffAssignExisting,
  staffAssignRole,
  staffAssignments,
  staffCandidates,
  staffCreate,
  staffDeactivateBranch,
  staffGet,
  staffList,
  staffPermission,
  staffPrimary,
  staffRemoveBranch,
  staffRemovePermission,
  staffRemoveRole,
  staffTransferBranch,
} from "@/api/generated/endpoints/staff/staff";
import { usersActivate } from "@/api/generated/endpoints/users/users";
import { branchesList } from "@/api/generated/endpoints/branches/branches";
import { rolesGet, rolesList } from "@/api/generated/endpoints/roles/roles";
import { BRANCH_HEADER_NAME } from "@/api/http/branch-scope";

const branchScopedRequest = { branchScoped: true } as const;
const branchScopedRequestFor = (branchId: string) => ({
  branchScoped: true,
  headers: { [BRANCH_HEADER_NAME]: branchId },
});

export function listStaff(params: StaffListParams, signal?: AbortSignal) {
  return staffList(params, branchScopedRequest, signal);
}

export function getStaff(id: string, signal?: AbortSignal) {
  return staffGet(id, branchScopedRequest, signal);
}

export function createStaff(payload: CreateStaffDto) {
  return staffCreate(payload, branchScopedRequest);
}

export function listStaffCandidates(
  params: StaffCandidatesParams,
  signal?: AbortSignal,
) {
  return staffCandidates(params, branchScopedRequest, signal);
}

export function assignExistingStaff(
  id: string,
  payload: AssignExistingStaffDto,
  branchId?: string,
) {
  return staffAssignExisting(
    id,
    payload,
    branchId ? branchScopedRequestFor(branchId) : branchScopedRequest,
  );
}

export function getStaffGlobalAssignments(id: string, signal?: AbortSignal) {
  return staffAssignments(id, undefined, signal);
}

export function listStaffRoleCatalog(
  params: RolesListParams,
  signal?: AbortSignal,
  branchId?: string,
) {
  return rolesList(
    params,
    branchId ? branchScopedRequestFor(branchId) : branchScopedRequest,
    signal,
  );
}

export function listAssignableStaffRoles(
  params: StaffAssignableRolesParams,
  signal?: AbortSignal,
  branchId?: string,
) {
  return staffAssignableRoles(
    params,
    branchId ? branchScopedRequestFor(branchId) : branchScopedRequest,
    signal,
  );
}

export function getStaffRoleDetail(
  id: string,
  signal?: AbortSignal,
  branchId?: string,
) {
  return rolesGet(
    id,
    branchId ? branchScopedRequestFor(branchId) : branchScopedRequest,
    signal,
  );
}

export function listStaffPermissionCatalog(
  params: StaffAssignablePermissionsParams,
  signal?: AbortSignal,
  branchId?: string,
) {
  return staffAssignablePermissions(
    params,
    branchId ? branchScopedRequestFor(branchId) : branchScopedRequest,
    signal,
  );
}

export function listActiveBranches(signal?: AbortSignal) {
  return branchesList(
    { page: 1, limit: 100, isActive: true, sortBy: "name", sortOrder: "asc" },
    undefined,
    signal,
  );
}

export const activateStaffAssignment = (id: string, branchId: string) =>
  staffActivateBranch(id, branchId);
export const deactivateStaffAssignment = (
  id: string,
  branchId: string,
  payload: ChangePrimaryBranchDto = {},
) => staffDeactivateBranch(id, branchId, payload);
export const removeStaffAssignment = (
  id: string,
  branchId: string,
  payload: ChangePrimaryBranchDto = {},
) => staffRemoveBranch(id, branchId, payload);
export const setStaffPrimary = (id: string, branchId: string) =>
  staffPrimary(id, branchId);
export const transferStaff = (id: string, payload: TransferStaffBranchDto) =>
  staffTransferBranch(id, payload);
export const activateStaffAccount = (id: string) => usersActivate(id);
export const assignStaffRole = (id: string, roleId: string) =>
  staffAssignRole(id, roleId, branchScopedRequest);
export const removeStaffRole = (id: string, roleId: string) =>
  staffRemoveRole(id, roleId, branchScopedRequest);
export const upsertStaffPermission = (
  id: string,
  permissionId: string,
  payload: UpsertUserPermissionDto,
) => staffPermission(id, permissionId, payload, branchScopedRequest);
export const removeStaffPermission = (id: string, permissionId: string) =>
  staffRemovePermission(id, permissionId, branchScopedRequest);
