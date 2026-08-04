import { z } from "zod";

const phonePattern = /^(?:\+?84|0)(?:\d[\s.-]?){8,10}$/;

export const branchAdminCreateSchema = z
  .object({
    fullName: z.string().trim().min(1, "Họ và tên là bắt buộc."),
    email: z
      .string()
      .trim()
      .min(1, "Email là bắt buộc.")
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
      .min(1, "Mật khẩu là bắt buộc.")
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
    branchIds: z
      .array(z.string().min(1))
      .min(1, "Vui lòng chọn ít nhất một chi nhánh."),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Mật khẩu nhập lại không khớp.",
      });
    }
    if (new Set(value.branchIds).size !== value.branchIds.length) {
      context.addIssue({
        code: "custom",
        path: ["branchIds"],
        message: "Mỗi chi nhánh chỉ được chọn một lần.",
      });
    }
  });

export type ValidBranchAdminCreateForm = z.infer<
  typeof branchAdminCreateSchema
>;
