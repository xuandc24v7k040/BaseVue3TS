import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên danh mục cần ít nhất 2 ký tự.")
    .max(120, "Tên danh mục tối đa 120 ký tự."),
  description: z.string().max(2000, "Mô tả tối đa 2.000 ký tự."),
  parentId: z.string().nullable(),
  type: z.enum(["NORMAL", "SYSTEM", "COLLECTION", "BRAND", "LANDING"]),
  isActive: z.boolean(),
  sortOrder: z
    .number()
    .int("Thứ tự phải là số nguyên.")
    .min(0, "Thứ tự không được âm.")
    .max(9999, "Thứ tự tối đa là 9.999."),
});
