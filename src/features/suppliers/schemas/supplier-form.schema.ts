import { z } from 'zod'
const optional = (max: number) => z.string().trim().max(max).optional()
export const supplierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tên nhà cung cấp phải có ít nhất 2 ký tự.')
    .max(120, 'Tên nhà cung cấp không được vượt quá 120 ký tự.'),
  phone: optional(20).refine(
    (v) => !v || /^[+\d][\d\s().-]{7,19}$/.test(v),
    'Số điện thoại không đúng định dạng.',
  ),
  email: optional(254).refine(
    (v) => !v || z.email().safeParse(v).success,
    'Email không đúng định dạng.',
  ),
  address: optional(500),
})
export type SupplierForm = z.infer<typeof supplierFormSchema>
