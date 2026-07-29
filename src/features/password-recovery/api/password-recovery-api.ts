import {
  authForgotPassword,
  authResetPassword,
  authValidateResetPasswordToken,
} from "@/api/generated/endpoints/auth/auth";
import type {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ValidateResetTokenResponseDto,
} from "@/api/generated/models";

export async function requestPasswordReset(
  payload: ForgotPasswordDto,
): Promise<ForgotPasswordResponseDto> {
  const response = await authForgotPassword(payload, {
    skipAuthRefresh: true,
  });
  return response.data;
}

export async function validatePasswordResetToken(
  token: string,
  signal?: AbortSignal,
): Promise<ValidateResetTokenResponseDto> {
  const response = await authValidateResetPasswordToken(
    { token },
    { skipAuthRefresh: true },
    signal,
  );
  return response.data;
}

export async function submitPasswordReset(
  payload: ResetPasswordDto,
): Promise<ResetPasswordResponseDto> {
  const response = await authResetPassword(payload, {
    skipAuthRefresh: true,
  });
  return response.data;
}
