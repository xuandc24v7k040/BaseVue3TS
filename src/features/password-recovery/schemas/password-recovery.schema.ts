import { z } from "zod";
import { newPasswordSchema } from "@/features/auth/password.schema";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .email("Email không đúng định dạng.")
    .max(254, "Email quá dài."),
});

export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });
