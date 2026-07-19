import { z } from "zod";

const phonePattern = /^(?:\+?84|0)(?:\d[\s.-]?){8,10}$/;

export const staffCreateSchema = z
  .object({
    fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập email.")
      .email("Email không đúng định dạng."),
    phone: z
      .string()
      .trim()
      .refine(
        (value) => value.length === 0 || phonePattern.test(value),
        "Số điện thoại không đúng định dạng.",
      ),
    password: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu.")
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string(),
    roleIds: z
      .array(z.string())
      .min(1, "Vui lòng chọn ít nhất một vai trò nhân viên."),
    permissionIds: z.array(z.string()),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Mật khẩu xác nhận không khớp.",
      });
    }
  });

export const assignExistingStaffSchema = z.object({
  userId: z.string().min(1, "Vui lòng chọn một tài khoản nội bộ."),
  roleIds: z
    .array(z.string())
    .min(1, "Vui lòng chọn ít nhất một vai trò nhân viên."),
  permissionIds: z.array(z.string()),
});

export type StaffCreateForm = z.input<typeof staffCreateSchema>;
export type AssignExistingStaffForm = z.input<typeof assignExistingStaffSchema>;
