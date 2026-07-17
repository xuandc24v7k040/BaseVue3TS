import { z } from 'zod'
import { RolesCreateBody } from '@/api/generated/zod/roles/roles'

export const ROLE_CODE_MESSAGE = 'Mã vai trò chỉ được gồm chữ in hoa, số và dấu gạch dưới (_).'

const roleLevelSchema = z.union([
  z.string(),
  z.number(),
], { error: 'Cấp độ vai trò phải là số.' })
  .refine(
    (value) => typeof value !== 'string' || value.trim().length > 0,
    'Cấp độ vai trò là bắt buộc.',
  )
  .pipe(
    z.coerce
      .number<string | number>({ error: 'Cấp độ vai trò phải là số.' })
      .int('Cấp độ vai trò phải là số nguyên.')
      .min(1, 'Cấp độ vai trò phải từ 1 đến 99.')
      .max(99, 'Cấp độ vai trò phải từ 1 đến 99.'),
  )

export const roleFormSchema = z.strictObject({
  code: z.string({ error: 'Mã vai trò phải là chuỗi.' }).trim().min(1, 'Mã vai trò là bắt buộc.').regex(/^[A-Z][A-Z0-9_]*$/, ROLE_CODE_MESSAGE),
  name: z.string({ error: 'Tên vai trò phải là chuỗi.' }).trim().min(1, 'Tên vai trò là bắt buộc.').min(2, 'Tên vai trò phải có ít nhất 2 ký tự.'),
  description: z.string({ error: 'Mô tả vai trò phải là chuỗi.' }).trim(),
  type: z.enum(['SYSTEM', 'BRANCH', 'CUSTOMER'], { message: 'Vui lòng chọn loại vai trò.' }),
  level: roleLevelSchema,
  guardName: z.literal('web', { message: 'Guard không hợp lệ.' }),
}).superRefine((value, context) => {
  const generated = RolesCreateBody.safeParse({
    ...value,
    description: value.description || undefined,
  })
  if (!generated.success) {
    generated.error.issues.forEach((issue) => context.addIssue({
      code: 'custom', path: issue.path, message: 'Dữ liệu không hợp lệ.',
    }))
  }
})

export type RoleFormData = z.output<typeof roleFormSchema>
