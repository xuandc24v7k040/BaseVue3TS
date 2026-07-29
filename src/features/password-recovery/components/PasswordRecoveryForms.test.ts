// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import ForgotPasswordForm from "./ForgotPasswordForm.vue";
import ResetPasswordForm from "./ResetPasswordForm.vue";

const {
  forgotMock,
  resetMock,
  validateMock,
  clearSessionHintMock,
  setAnonymousMock,
  clearQueriesMock,
  clearCsrfTokenMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  forgotMock: vi.fn(),
  resetMock: vi.fn(),
  validateMock: vi.fn(),
  clearSessionHintMock: vi.fn(),
  setAnonymousMock: vi.fn(),
  clearQueriesMock: vi.fn(),
  clearCsrfTokenMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { turnstileEnabled: false, turnstileSiteKey: "" },
}));
vi.mock("@/features/password-recovery/api/password-recovery-api", () => ({
  requestPasswordReset: forgotMock,
  submitPasswordReset: resetMock,
  validatePasswordResetToken: validateMock,
}));
vi.mock("@/features/auth/session-hint", () => ({
  clearSessionHint: clearSessionHintMock,
}));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({ setAnonymous: setAnonymousMock }),
}));
vi.mock("@/api/query-cache", () => ({
  clearAuthSensitiveQueries: clearQueriesMock,
}));
vi.mock("@/api/http/csrf-manager", () => ({
  clearCsrfToken: clearCsrfTokenMock,
}));
vi.mock("vue-sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

const TurnstileStub = {
  name: "TurnstileWidget",
  template: '<div data-testid="turnstile" />',
  methods: { reset: vi.fn() },
};

async function mountRecoveryForm(
  component: typeof ForgotPasswordForm | typeof ResetPasswordForm,
  initialPath: string,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/forgot-password", name: "customer-forgot-password", component: {} },
      { path: "/reset-password", name: "customer-reset-password", component: {} },
      { path: "/login", name: "customer-login", component: {} },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  const queryClient = new QueryClient();
  const wrapper = mount(component, {
    global: {
      plugins: [
        createPinia(),
        router,
        [VueQueryPlugin, { queryClient }],
      ],
      stubs: {
        AuthBrand: true,
        TurnstileWidget: TurnstileStub,
      },
    },
  });
  await flushPromises();
  return { wrapper, router, queryClient };
}

beforeEach(() => {
  forgotMock.mockReset();
  resetMock.mockReset();
  validateMock.mockReset();
  clearSessionHintMock.mockReset();
  setAnonymousMock.mockReset();
  clearQueriesMock.mockReset();
  clearCsrfTokenMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
  forgotMock.mockResolvedValue({ success: true, message: "Đã gửi hướng dẫn." });
  validateMock.mockResolvedValue({ status: "VALID" });
  resetMock.mockResolvedValue({ success: true });
});

describe("ForgotPasswordForm", () => {
  it("validates locally then keeps the generic success result visible", async () => {
    const { wrapper } = await mountRecoveryForm(
      ForgotPasswordForm,
      "/forgot-password",
    );

    expect(wrapper.text()).toContain(
      "Thời hạn sử dụng liên kết sẽ được ghi rõ trong email.",
    );
    expect(wrapper.text()).not.toContain("15 phút");
    await wrapper.get("form").trigger("submit");
    expect(forgotMock).not.toHaveBeenCalled();

    await wrapper.get("#forgot-password-email").setValue("reader@bookora.vn");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(forgotMock).toHaveBeenCalledWith({ email: "reader@bookora.vn" });
    expect(wrapper.text()).toContain("Kiểm tra hộp thư của bạn");
    expect(wrapper.text()).toContain("Đã gửi hướng dẫn.");
    expect(wrapper.find("form").exists()).toBe(false);
    expect(toastSuccessMock).toHaveBeenCalledOnce();
  });

  it("shows missing email inline with an error toast and clears it on change", async () => {
    forgotMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        data: { code: "PASSWORD_RESET_EMAIL_NOT_FOUND" },
      },
    });
    const { wrapper } = await mountRecoveryForm(
      ForgotPasswordForm,
      "/forgot-password",
    );
    const email = wrapper.get("#forgot-password-email");

    await email.setValue("missing@bookora.vn");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Email này chưa được đăng ký trong hệ thống.",
    );
    expect(email.attributes("aria-invalid")).toBe("true");
    expect(email.attributes("aria-describedby")).toBe(
      "forgot-password-email-error",
    );
    expect(wrapper.text()).not.toContain("Kiểm tra hộp thư của bạn");
    expect(toastErrorMock).toHaveBeenCalledOnce();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Email này chưa được đăng ký trong hệ thống.",
      { id: "forgot-password-result" },
    );

    await email.setValue("other@bookora.vn");
    expect(wrapper.text()).not.toContain(
      "Email này chưa được đăng ký trong hệ thống.",
    );
  });

  it("shows Google guidance with a login action and clears it on change", async () => {
    forgotMock.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          code: "PASSWORD_RESET_UNSUPPORTED_GOOGLE_PROVIDER",
        },
      },
    });
    const { wrapper } = await mountRecoveryForm(
      ForgotPasswordForm,
      "/forgot-password",
    );
    const email = wrapper.get("#forgot-password-email");

    await email.setValue("google@bookora.vn");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Tài khoản này đăng nhập bằng Google và không sử dụng mật khẩu Bookora.",
    );
    expect(wrapper.get('a[href="/login"]').text()).toContain(
      "Đăng nhập với Google",
    );
    expect(toastErrorMock).not.toHaveBeenCalled();

    await email.setValue("other@bookora.vn");
    expect(wrapper.text()).not.toContain(
      "Tài khoản này đăng nhập bằng Google",
    );
  });
});

describe("ResetPasswordForm", () => {
  it("validates the route token and clears local auth state after reset", async () => {
    const rawToken = "a".repeat(43);
    const { wrapper, router, queryClient } = await mountRecoveryForm(
      ResetPasswordForm,
      `/reset-password?token=${rawToken}`,
    );

    expect(validateMock).toHaveBeenCalledWith(rawToken, expect.any(AbortSignal));
    await wrapper.get("#reset-password-new").setValue("Password1");
    await wrapper.get("#reset-password-confirm").setValue("Password1");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(resetMock).toHaveBeenCalledWith({
      token: rawToken,
      newPassword: "Password1",
    });
    expect(clearCsrfTokenMock).toHaveBeenCalledOnce();
    expect(clearCsrfTokenMock.mock.invocationCallOrder[0]).toBeLessThan(
      setAnonymousMock.mock.invocationCallOrder[0]!,
    );
    expect(clearSessionHintMock).toHaveBeenCalledOnce();
    expect(setAnonymousMock).toHaveBeenCalledOnce();
    expect(clearQueriesMock).toHaveBeenCalledWith(queryClient);
    expect(toastSuccessMock).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.name).toBe("customer-login");
  });

  it("rejects a missing token without calling validation", async () => {
    const { wrapper } = await mountRecoveryForm(
      ResetPasswordForm,
      "/reset-password",
    );

    expect(validateMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Liên kết đặt lại mật khẩu không hợp lệ.");
    expect(wrapper.find("form").exists()).toBe(false);
  });
});
