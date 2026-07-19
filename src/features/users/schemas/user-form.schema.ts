import { z } from 'zod'
import { UsersCreateBody } from '@/api/generated/zod/users/users'

const dateOnly = /^\d{4}-\d{2}-\d{2}$/

function isValidDateOnly(value: string): boolean {
  if (!dateOnly.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const userFormSchema = z.strictObject({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên.'),
  email: z.string().trim().min(1, 'Vui lòng nhập email.').email('Email không đúng định dạng.'),
  phone: z.string().trim(),
  gender: z.string().trim().max(20, 'Giới tính không được vượt quá 20 ký tự.'),
  birthday: z.string().trim().refine(
    (value) => !value || isValidDateOnly(value),
    'Ngày sinh không hợp lệ.',
  ),
}).superRefine((value, context) => {
  const generated = UsersCreateBody.safeParse({
    fullName: value.fullName,
    email: value.email,
    phone: value.phone || null,
    gender: value.gender || null,
    birthday: value.birthday || null,
  })
  if (!generated.success) {
    generated.error.issues.forEach((issue) => context.addIssue({
      code: 'custom',
      path: issue.path,
      message: issue.path[0] === 'birthday' ? 'Ngày sinh không hợp lệ.' : 'Dữ liệu không hợp lệ.',
    }))
  }
})

export type UserFormData = z.output<typeof userFormSchema>
