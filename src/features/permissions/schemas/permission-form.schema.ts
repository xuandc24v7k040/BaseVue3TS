import { z } from 'zod'
import { PermissionsCreateBody } from '@/api/generated/zod/permissions/permissions'

const SEGMENT_PATTERN = /^[a-z][a-z0-9_]*$/
const CODE_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/

export const permissionFormSchema = z.strictObject({
  code: z.string().trim().min(1, 'Mã quyền là bắt buộc.').regex(CODE_PATTERN, 'Mã quyền chỉ được gồm chữ thường, số, dấu gạch dưới và dấu chấm.'),
  name: z.string().trim().min(1, 'Tên quyền là bắt buộc.'),
  resource: z.string().trim().min(1, 'Tài nguyên là bắt buộc.').regex(SEGMENT_PATTERN, 'Tài nguyên chỉ được gồm chữ thường, số và dấu gạch dưới.'),
  action: z.string().trim().min(1, 'Hành động là bắt buộc.').regex(SEGMENT_PATTERN, 'Hành động chỉ được gồm chữ thường, số và dấu gạch dưới.'),
  guardName: z.literal('web', { message: 'Guard không hợp lệ.' }),
  description: z.string().trim(),
}).superRefine((value, context) => {
  if (value.code !== `${value.resource}.${value.action}`) {
    context.addIssue({ code: 'custom', path: ['code'], message: 'Mã quyền phải khớp với tài nguyên và hành động.' })
  }
  const generated = PermissionsCreateBody.safeParse({ ...value, description: value.description || undefined })
  if (!generated.success) {
    generated.error.issues.forEach((issue) => context.addIssue({ code: 'custom', path: issue.path, message: 'Dữ liệu không hợp lệ.' }))
  }
})

export type PermissionFormData = z.output<typeof permissionFormSchema>
