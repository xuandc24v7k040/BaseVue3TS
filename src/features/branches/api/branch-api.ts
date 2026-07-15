import type { AxiosRequestConfig } from 'axios'
import type {
  BranchesListParams,
  CreateBranchDto,
  UpdateBranchDto,
  VietMapAutocompleteParams,
  VietMapPlaceParams,
  VietMapReverseParams,
} from '@/api/generated/models'
import {
  branchesCreate,
  branchesDeactivate,
  branchesGet,
  branchesList,
  branchesUpdate,
} from '@/api/generated/endpoints/branches/branches'
import {
  vietMapAutocomplete,
  vietMapPlace,
  vietMapReverse,
} from '@/api/generated/endpoints/vietmap/vietmap'
import { BRANCH_HEADER_NAME } from '@/api/http/branch-scope'

function scopeRequest(scopeId: string | null): AxiosRequestConfig | undefined {
  return scopeId ? { headers: { [BRANCH_HEADER_NAME]: scopeId } } : undefined
}

export async function listBranches(
  params: BranchesListParams,
  scopeId: string | null = null,
  signal?: AbortSignal,
) {
  return branchesList(params, scopeRequest(scopeId), signal)
}

export async function getBranch(id: string, scopeId: string | null = null, signal?: AbortSignal) {
  return branchesGet(id, scopeRequest(scopeId), signal)
}

export async function createBranch(payload: CreateBranchDto) {
  return branchesCreate(payload)
}

export async function updateBranch(id: string, payload: UpdateBranchDto) {
  return branchesUpdate(id, payload)
}

export async function deactivateBranch(id: string) {
  return branchesDeactivate(id)
}

export async function reverseBranchLocation(
  params: VietMapReverseParams,
  signal?: AbortSignal,
) {
  return vietMapReverse(params, undefined, signal)
}

export async function autocompleteBranchLocation(
  params: VietMapAutocompleteParams,
  signal?: AbortSignal,
) {
  return vietMapAutocomplete(params, undefined, signal)
}

export async function resolveBranchPlace(
  params: VietMapPlaceParams,
  signal?: AbortSignal,
) {
  return vietMapPlace(params, undefined, signal)
}
