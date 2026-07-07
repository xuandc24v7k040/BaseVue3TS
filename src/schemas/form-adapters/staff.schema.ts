import type { z } from 'zod'
import {
  StaffConvertBody,
  StaffCreateBody,
  StaffTransferBranchBody,
} from '@/api/generated/zod/staff/staff'
import { addDuplicateStringArrayIssues } from './shared/unique-array'

const ROLE_IDS_DUPLICATE_MESSAGE = 'Moi vai tro chi duoc chon mot lan.'
const PERMISSION_IDS_DUPLICATE_MESSAGE = 'Moi quyen chi duoc chon mot lan.'

export const createStaffFormSchema = StaffCreateBody.superRefine((value, ctx) => {
  addDuplicateStringArrayIssues(
    ctx,
    value.roleIds,
    ['roleIds'],
    ROLE_IDS_DUPLICATE_MESSAGE,
  )
  addDuplicateStringArrayIssues(
    ctx,
    value.permissionIds,
    ['permissionIds'],
    PERMISSION_IDS_DUPLICATE_MESSAGE,
  )
})

export const convertStaffFormSchema = StaffConvertBody.superRefine((value, ctx) => {
  value.branchAssignments.forEach((assignment, assignmentIndex) => {
    addDuplicateStringArrayIssues(
      ctx,
      assignment.roleIds,
      ['branchAssignments', assignmentIndex, 'roleIds'],
      ROLE_IDS_DUPLICATE_MESSAGE,
    )
  })
})

export const transferStaffBranchFormSchema = StaffTransferBranchBody.superRefine((value, ctx) => {
  addDuplicateStringArrayIssues(
    ctx,
    value.destinationRoleIds,
    ['destinationRoleIds'],
    ROLE_IDS_DUPLICATE_MESSAGE,
  )
})

export type CreateStaffFormInput = z.input<typeof createStaffFormSchema>
export type ConvertStaffFormInput = z.input<typeof convertStaffFormSchema>
export type TransferStaffBranchFormInput = z.input<typeof transferStaffBranchFormSchema>

