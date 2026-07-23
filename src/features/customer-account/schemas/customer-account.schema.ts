import { z } from "zod";

const vietnamPhone = /^(?:0\d{9}|\+84\d{9})$/;
const requiredAdministrativeCode = (message: string) =>
  z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.number({ error: message }).int().positive(message),
  );

export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ và tên cần ít nhất 2 ký tự.").max(100),
  phone: z.union([
    z.string().trim().regex(vietnamPhone, "Số điện thoại không hợp lệ."),
    z.literal(""),
  ]),
  gender: z.enum(["male", "female", "other", "unspecified"]),
  birthday: z.string(),
  defaultAddressId: z.string(),
});

export const customerAddressSchema = z.object({
  label: z.string().trim().max(50),
  recipientName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ và tên người nhận.")
    .max(100),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại.")
    .regex(vietnamPhone, "Số điện thoại không hợp lệ."),
  provinceCode: requiredAdministrativeCode(
    "Vui lòng chọn tỉnh hoặc thành phố.",
  ),
  wardCode: requiredAdministrativeCode("Vui lòng chọn phường hoặc xã."),
  addressDetail: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ chi tiết.")
    .max(255),
  isDefault: z.boolean(),
});

export const customerPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới cần ít nhất 8 ký tự.")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Mật khẩu mới phải gồm chữ và số."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận chưa khớp.",
  });
