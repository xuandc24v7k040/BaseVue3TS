import { describe, expect, it } from 'vitest'
import { BranchAdminsCreateBody } from '@/api/generated/zod/branch-admins/branch-admins'
import { StaffCreateBody, StaffTransferBranchBody } from '@/api/generated/zod/staff/staff'
import {
  convertBranchAdminFormSchema,
  createInternalUserFormSchema,
} from '@/schemas/form-adapters/branch-admin.schema'
import {
  convertStaffFormSchema,
  createStaffFormSchema,
  transferStaffBranchFormSchema,
} from '@/schemas/form-adapters/staff.schema'

const VALID_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV'
const VALID_ULID_TWO = '01BRZ3NDEKTSV4RRFFQ69G5FAV'

function expectInvalid(schema: { safeParse: (value: unknown) => { success: boolean } }, value: unknown) {
  expect(schema.safeParse(value).success).toBe(false)
}

describe('uniqueItems form adapters', () => {
  it('keeps generated schema untouched and rejects duplicate branch IDs in adapters', () => {
    const payload = {
      email: 'admin@bookora.test',
      fullName: 'Branch Admin',
      password: 'Password1',
      branchIds: [VALID_ULID, VALID_ULID],
    }

    expect(BranchAdminsCreateBody.safeParse(payload).success).toBe(true)
    expectInvalid(createInternalUserFormSchema, payload)
    expectInvalid(convertBranchAdminFormSchema, {
      branchIds: [VALID_ULID, VALID_ULID],
    })
    expect(convertBranchAdminFormSchema.parse({
      branchIds: [VALID_ULID, VALID_ULID_TWO],
    })).toEqual({
      branchIds: [VALID_ULID, VALID_ULID_TWO],
    })
  })

  it('preserves generated minItems and ULID validation', () => {
    const payload = {
      fromBranchId: VALID_ULID,
      toBranchId: VALID_ULID_TWO,
      destinationRoleIds: [VALID_ULID, VALID_ULID],
    }

    expect(StaffTransferBranchBody.safeParse(payload).success).toBe(true)
    expectInvalid(transferStaffBranchFormSchema, payload)
    expectInvalid(transferStaffBranchFormSchema, {
      ...payload,
      destinationRoleIds: [],
    })
    expectInvalid(transferStaffBranchFormSchema, {
      ...payload,
      destinationRoleIds: ['not-a-ulid'],
    })
  })

  it('validates multiple unique staff fields independently', () => {
    const basePayload = {
      email: 'staff@bookora.test',
      fullName: 'Staff User',
      password: 'Password1',
      roleIds: [VALID_ULID],
    }

    expect(StaffCreateBody.safeParse({
      ...basePayload,
      roleIds: [VALID_ULID, VALID_ULID],
      permissionIds: [VALID_ULID_TWO, VALID_ULID_TWO],
    }).success).toBe(true)
    expectInvalid(createStaffFormSchema, {
      ...basePayload,
      roleIds: [VALID_ULID, VALID_ULID],
    })
    expectInvalid(createStaffFormSchema, {
      ...basePayload,
      permissionIds: [VALID_ULID_TWO, VALID_ULID_TWO],
    })
    expect(createStaffFormSchema.parse(basePayload)).toEqual(basePayload)
  })

  it('rejects duplicate nested role IDs in staff conversion assignments', () => {
    const payload = {
      branchAssignments: [
        {
          branchId: VALID_ULID,
          isPrimary: true,
          roleIds: [VALID_ULID_TWO, VALID_ULID_TWO],
        },
      ],
    }

    expectInvalid(convertStaffFormSchema, payload)
    expect(convertStaffFormSchema.parse({
      branchAssignments: [
        {
          branchId: VALID_ULID,
          isPrimary: true,
          roleIds: [VALID_ULID_TWO],
        },
      ],
    })).toEqual({
      branchAssignments: [
        {
          branchId: VALID_ULID,
          isPrimary: true,
          roleIds: [VALID_ULID_TWO],
        },
      ],
    })
  })
})

