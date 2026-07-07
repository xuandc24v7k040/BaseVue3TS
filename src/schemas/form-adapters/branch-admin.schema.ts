import type { z } from 'zod'
import {
  BranchAdminsConvertBody,
  BranchAdminsCreateBody,
} from '@/api/generated/zod/branch-admins/branch-admins'
import { addDuplicateStringArrayIssues } from './shared/unique-array'

const BRANCH_IDS_DUPLICATE_MESSAGE = 'Moi chi nhanh chi duoc chon mot lan.'

export const createInternalUserFormSchema = BranchAdminsCreateBody.superRefine((value, ctx) => {
  addDuplicateStringArrayIssues(
    ctx,
    value.branchIds,
    ['branchIds'],
    BRANCH_IDS_DUPLICATE_MESSAGE,
  )
})

export const convertBranchAdminFormSchema = BranchAdminsConvertBody.superRefine((value, ctx) => {
  addDuplicateStringArrayIssues(
    ctx,
    value.branchIds,
    ['branchIds'],
    BRANCH_IDS_DUPLICATE_MESSAGE,
  )
})

export type CreateInternalUserFormInput = z.input<typeof createInternalUserFormSchema>
export type ConvertBranchAdminFormInput = z.input<typeof convertBranchAdminFormSchema>

