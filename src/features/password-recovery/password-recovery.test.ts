import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  passwordRecoveryErrorCode,
  passwordRecoveryErrorMessage,
  resetLinkFailureState,
} from "./utils/password-recovery-errors";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas/password-recovery.schema";

const {
  forgotMock,
  resetMock,
  validateMock,
} = vi.hoisted(() => ({
  forgotMock: vi.fn(),
  resetMock: vi.fn(),
  validateMock: vi.fn(),
}));

vi.mock("@/api/generated/endpoints/auth/auth", () => ({
  authForgotPassword: forgotMock,
  authResetPassword: resetMock,
  authValidateResetPasswordToken: validateMock,
}));

import {
  requestPasswordReset,
  submitPasswordReset,
  validatePasswordResetToken,
} from "./api/password-recovery-api";

function apiError(status: number, code: string): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError("request failed", undefined, config, undefined, {
    data: { statusCode: status, message: "request failed", code },
    status,
    statusText: "Error",
    headers: {},
    config,
  });
}

beforeEach(() => {
  forgotMock.mockReset();
  resetMock.mockReset();
  validateMock.mockReset();
});

describe("password recovery schemas", () => {
  it("normalizes email and enforces the shared password policy", () => {
    expect(
      forgotPasswordSchema.parse({ email: "  reader@bookora.vn " }).email,
    ).toBe("reader@bookora.vn");
    expect(
      resetPasswordSchema.safeParse({
        newPassword: "abcdefgh",
        confirmPassword: "abcdefgh",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        newPassword: "Password1",
        confirmPassword: "Password2",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        newPassword: "Password1",
        confirmPassword: "Password1",
      }).success,
    ).toBe(true);
  });
});

describe("password recovery API boundary", () => {
  it("uses generated clients and always suppresses auth refresh", async () => {
    const signal = new AbortController().signal;
    forgotMock.mockResolvedValue({ data: { success: true, message: "ok" } });
    validateMock.mockResolvedValue({ data: { status: "VALID" } });
    resetMock.mockResolvedValue({ data: { success: true } });

    await requestPasswordReset({ email: "reader@bookora.vn" });
    await validatePasswordResetToken("a".repeat(43), signal);
    await submitPasswordReset({
      token: "a".repeat(43),
      newPassword: "Password1",
    });

    expect(forgotMock).toHaveBeenCalledWith(
      { email: "reader@bookora.vn" },
      { skipAuthRefresh: true },
    );
    expect(validateMock).toHaveBeenCalledWith(
      { token: "a".repeat(43) },
      { skipAuthRefresh: true },
      signal,
    );
    expect(resetMock).toHaveBeenCalledWith(
      { token: "a".repeat(43), newPassword: "Password1" },
      { skipAuthRefresh: true },
    );
  });
});

describe("password recovery error mapping", () => {
  it("maps link states and provider guidance without exposing backend text", () => {
    expect(
      passwordRecoveryErrorCode(
        apiError(404, "PASSWORD_RESET_EMAIL_NOT_FOUND"),
      ),
    ).toBe("PASSWORD_RESET_EMAIL_NOT_FOUND");
    expect(
      passwordRecoveryErrorMessage(
        apiError(404, "PASSWORD_RESET_EMAIL_NOT_FOUND"),
      ),
    ).toBe("Email này chưa được đăng ký trong hệ thống.");
    expect(
      resetLinkFailureState(apiError(410, "PASSWORD_RESET_TOKEN_EXPIRED")),
    ).toBe("expired");
    expect(
      passwordRecoveryErrorMessage(
        apiError(409, "PASSWORD_RESET_UNSUPPORTED_GOOGLE_PROVIDER"),
      ),
    ).toContain("Google");
    expect(passwordRecoveryErrorMessage(apiError(500, "INTERNAL"))).toContain(
      "tạm thời",
    );
  });
});
