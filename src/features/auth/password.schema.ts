import { z } from "zod";

export const newPasswordSchema = z
  .string()
  .min(8, "Mật khẩu mới cần ít nhất 8 ký tự.")
  .max(128, "Mật khẩu mới không được vượt quá 128 ký tự.")
  .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, "Mật khẩu mới phải gồm chữ và số.");
