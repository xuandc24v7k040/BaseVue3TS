// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import CustomerLoginForm from "./CustomerLoginForm.vue";
import CustomerRegisterForm from "./CustomerRegisterForm.vue";

const envMock = vi.hoisted(() => ({
  turnstileEnabled: false,
  turnstileSiteKey: "",
}));
const toastInfo = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
const registerMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env", () => ({ env: envMock }));
vi.mock("vue-sonner", () => ({
  toast: {
    info: toastInfo,
    error: toastError,
    success: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({ login: loginMock }),
}));
vi.mock("@/api/modules/auth.api", () => ({
  registerCustomer: registerMock,
}));

const TurnstileStub = {
  name: "TurnstileWidget",
  emits: ["verified", "expired", "error"],
  template: '<div data-testid="turnstile" />',
};

async function mountForm(
  component: typeof CustomerLoginForm | typeof CustomerRegisterForm,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "client-home", component: {} },
      { path: "/login", name: "customer-login", component: {} },
      { path: "/register", component: {} },
      { path: "/forgot-password", component: {} },
      {
        path: "/account",
        component: {},
        meta: { allowedUserTypes: ["CUSTOMER"] },
      },
      {
        path: "/super-admin/dashboard",
        name: "super-admin-dashboard",
        component: {},
        meta: { allowedUserTypes: ["SYSTEM"] },
      },
      {
        path: "/branch-admin/dashboard",
        name: "branch-admin-dashboard",
        component: {},
        meta: { allowedUserTypes: ["BRANCH"] },
      },
    ],
  });
  await router.push("/login");
  await router.isReady();

  return mount(component, {
    global: {
      plugins: [
        createPinia(),
        router,
        [VueQueryPlugin, { queryClient: new QueryClient() }],
      ],
      stubs: { TurnstileWidget: TurnstileStub },
    },
  });
}

async function fillValidLogin(wrapper: Awaited<ReturnType<typeof mountForm>>) {
  await wrapper.get("#customer-login-email").setValue("reader@bookora.vn");
  await wrapper.get("#customer-login-password").setValue("Password1");
}

async function fillValidRegistration(
  wrapper: Awaited<ReturnType<typeof mountForm>>,
) {
  await wrapper.get("#customer-register-name").setValue("Nguyễn An");
  await wrapper.get("#customer-register-email").setValue("reader@bookora.vn");
  await wrapper.get("#customer-register-password").setValue("Password1");
  await wrapper
    .get("#customer-register-confirm-password")
    .setValue("Password1");
}

beforeEach(() => {
  localStorage.clear();
  envMock.turnstileEnabled = false;
  envMock.turnstileSiteKey = "";
  toastInfo.mockReset();
  toastError.mockReset();
  loginMock.mockReset();
  registerMock.mockReset();
  loginMock.mockResolvedValue({
    id: "customer-1",
    email: "reader@bookora.vn",
    fullName: "Nguyễn An",
    type: "CUSTOMER",
    isSuperAdmin: false,
    roles: [],
    permissions: [],
    branches: [],
    primaryBranchId: null,
  });
  registerMock.mockResolvedValue({
    id: "customer-1",
    email: "reader@bookora.vn",
    fullName: "Nguyễn An",
    type: "CUSTOMER",
  });
});

describe("CustomerLoginForm", () => {
  it("renders the approved controls and navigation", async () => {
    const wrapper = await mountForm(CustomerLoginForm);

    expect(wrapper.text()).toContain("Chào mừng trở lại!");
    expect(wrapper.text()).toContain("Đăng nhập với Google");
    expect(wrapper.find("#customer-login-email").exists()).toBe(true);
    expect(wrapper.find("#customer-login-password").exists()).toBe(true);
    expect(wrapper.text()).toContain("Ghi nhớ email");
    expect(wrapper.get('a[href="/forgot-password"]').text()).toBe(
      "Quên mật khẩu?",
    );
    expect(wrapper.get('a[href="/register"]').text()).toBe("Đăng ký ngay");
    expect(wrapper.find('[data-testid="turnstile"]').exists()).toBe(true);
  });

  it("reserves stable error regions and does not use internal scroll or serif typography", async () => {
    const wrapper = await mountForm(CustomerLoginForm);
    const errorSlots = wrapper.findAll("[data-error-slot]");

    expect(errorSlots).toHaveLength(4);
    expect(
      errorSlots
        .filter((slot) => slot.attributes("data-error-slot") !== "global")
        .every((slot) => slot.classes().includes("min-h-[18px]")),
    ).toBe(true);
    expect(wrapper.get('[data-error-slot="global"]').classes()).toEqual(
      expect.arrayContaining(["h-[70px]", "sm:h-[52px]"]),
    );
    expect(wrapper.get(".auth-form-panel").classes()).not.toContain(
      "overflow-y-auto",
    );
    expect(wrapper.get(".auth-login-content").classes()).toContain("md:py-5");
    expect(wrapper.html()).not.toContain("font-serif");

    await wrapper.get("form").trigger("submit");

    expect(wrapper.text()).toContain("Vui lòng nhập email.");
    expect(wrapper.text()).toContain("Vui lòng nhập mật khẩu.");
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    expect(wrapper.get('a[href="/register"]').text()).toBe("Đăng ký ngay");
  });

  it("validates email and password without calling an API", async () => {
    const wrapper = await mountForm(CustomerLoginForm);
    await wrapper.get("#customer-login-email").setValue("email-sai");
    await wrapper.get("#customer-login-password").setValue("short");
    await wrapper.get("form").trigger("submit");

    expect(wrapper.text()).toContain("Email không đúng định dạng.");
    expect(wrapper.text()).toContain(
      "Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.",
    );
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    const wrapper = await mountForm(CustomerLoginForm);
    const input = wrapper.get("#customer-login-password");

    expect(input.attributes("type")).toBe("password");
    await wrapper.get('[aria-label="Hiện mật khẩu"]').trigger("click");
    expect(input.attributes("type")).toBe("text");
    expect(wrapper.find('[aria-label="Ẩn mật khẩu"]').exists()).toBe(true);
  });

  it("shows a stable global error badge and one deduplicated toast for rejected credentials", async () => {
    loginMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: "Unauthorized" } },
    });
    const wrapper = await mountForm(CustomerLoginForm);
    await fillValidLogin(wrapper);

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const error = wrapper.get('[data-error-slot="global"] [role="alert"]');
    expect(error.text()).toBe("Email hoặc mật khẩu không chính xác.");
    expect(error.classes()).toEqual(
      expect.arrayContaining([
        "rounded-xl",
        "bg-destructive/10",
        "px-3",
        "py-2",
        "text-destructive",
      ]),
    );
    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith(
      "Email hoặc mật khẩu không chính xác.",
      { id: "customer-login-auth-error" },
    );
  });

  it("requires Turnstile, accepts a token, and clears it on expiry or error", async () => {
    envMock.turnstileEnabled = true;
    envMock.turnstileSiteKey = "site-key";
    const wrapper = await mountForm(CustomerLoginForm);
    const turnstile = wrapper.findComponent({ name: "TurnstileWidget" });
    await fillValidLogin(wrapper);

    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Vui lòng hoàn tất xác minh bảo mật.");

    turnstile.vm.$emit("verified", "customer-token");
    await wrapper.vm.$nextTick();
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(loginMock).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileToken: "customer-token" }),
    );

    turnstile.vm.$emit("expired");
    await wrapper.vm.$nextTick();
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Vui lòng hoàn tất xác minh bảo mật.");

    turnstile.vm.$emit("verified", "new-token");
    turnstile.vm.$emit("error");
    await wrapper.vm.$nextTick();
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Vui lòng hoàn tất xác minh bảo mật.");
  });
});

describe("CustomerRegisterForm", () => {
  it("renders all registration controls and the login link", async () => {
    const wrapper = await mountForm(CustomerRegisterForm);

    expect(wrapper.text()).toContain("Tạo tài khoản mới");
    expect(wrapper.text()).toContain("Đăng ký với Google");
    expect(wrapper.find("#customer-register-name").exists()).toBe(true);
    expect(wrapper.find("#customer-register-email").exists()).toBe(true);
    expect(wrapper.find("#customer-register-password").exists()).toBe(true);
    expect(wrapper.find("#customer-register-confirm-password").exists()).toBe(
      true,
    );
    expect(wrapper.get('a[href="/login"]').text()).toBe("Đăng nhập ngay");
    expect(wrapper.find('[data-testid="turnstile"]').exists()).toBe(true);

    const fieldStack = wrapper.get("[data-register-fields]");
    const emailInput = wrapper.get("#customer-register-email");
    expect(fieldStack.classes()).toContain("flex");
    expect(fieldStack.classes()).not.toContain("grid");
    expect(emailInput.classes()).toEqual(
      expect.arrayContaining(["w-full", "min-w-0"]),
    );
    expect(emailInput.attributes("autocomplete")).toBe("email");
  });

  it("keeps all error regions stable and the complete form visible after empty submit", async () => {
    const wrapper = await mountForm(CustomerRegisterForm);
    const errorSlots = wrapper.findAll("[data-error-slot]");

    expect(errorSlots).toHaveLength(6);
    expect(
      errorSlots
        .filter((slot) => slot.attributes("data-error-slot") !== "global")
        .every((slot) => slot.classes().includes("min-h-[18px]")),
    ).toBe(true);
    expect(wrapper.get('[data-error-slot="global"]').classes()).toEqual(
      expect.arrayContaining(["h-[70px]", "sm:h-[52px]"]),
    );
    expect(wrapper.get(".auth-register-panel").classes()).not.toContain(
      "overflow-y-auto",
    );
    expect(wrapper.html()).not.toContain("font-serif");

    await wrapper.get("form").trigger("submit");

    expect(wrapper.text()).toContain("Vui lòng nhập họ và tên.");
    expect(wrapper.text()).toContain("Vui lòng nhập email.");
    expect(wrapper.text()).toContain("Vui lòng nhập mật khẩu.");
    expect(wrapper.text()).toContain("Vui lòng xác nhận mật khẩu.");
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
    expect(wrapper.get('a[href="/login"]').text()).toBe("Đăng nhập ngay");
  });

  it("validates name, email, password constraints, and password confirmation", async () => {
    const wrapper = await mountForm(CustomerRegisterForm);
    await wrapper.get("#customer-register-name").setValue("A");
    await wrapper.get("#customer-register-email").setValue("email-sai");
    await wrapper.get("#customer-register-password").setValue("abcdefgh");
    await wrapper
      .get("#customer-register-confirm-password")
      .setValue("khong-khop");
    await wrapper.get("form").trigger("submit");

    expect(wrapper.text()).toContain("Họ và tên cần ít nhất 2 ký tự.");
    expect(wrapper.text()).toContain("Email không đúng định dạng.");
    expect(wrapper.text()).toContain(
      "Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.",
    );
    expect(wrapper.text()).toContain("Mật khẩu xác nhận không khớp.");
  });

  it("toggles both password fields", async () => {
    const wrapper = await mountForm(CustomerRegisterForm);
    await wrapper.get('[aria-label="Hiện mật khẩu"]').trigger("click");
    await wrapper.get('[aria-label="Hiện mật khẩu xác nhận"]').trigger("click");

    expect(wrapper.get("#customer-register-password").attributes("type")).toBe(
      "text",
    );
    expect(
      wrapper.get("#customer-register-confirm-password").attributes("type"),
    ).toBe("text");
  });

  it("shows duplicate email in the global badge and one deduplicated toast", async () => {
    registerMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: "Conflict" } },
    });
    const wrapper = await mountForm(CustomerRegisterForm);
    await fillValidRegistration(wrapper);

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const error = wrapper.get('[data-error-slot="global"] [role="alert"]');
    expect(error.text()).toBe("Email đã được sử dụng.");
    expect(error.classes()).toEqual(
      expect.arrayContaining([
        "rounded-xl",
        "bg-destructive/10",
        "px-3",
        "py-2",
        "text-destructive",
      ]),
    );
    expect(toastError).toHaveBeenCalledOnce();
    expect(toastError).toHaveBeenCalledWith("Email đã được sử dụng.", {
      id: "customer-register-auth-error",
    });
  });

  it("submits only after Turnstile verification and clears tokens on widget events", async () => {
    envMock.turnstileEnabled = true;
    envMock.turnstileSiteKey = "site-key";
    const wrapper = await mountForm(CustomerRegisterForm);
    const turnstile = wrapper.findComponent({ name: "TurnstileWidget" });
    await fillValidRegistration(wrapper);

    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Vui lòng hoàn tất xác minh bảo mật.");

    turnstile.vm.$emit("verified", "customer-token");
    await wrapper.vm.$nextTick();
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(registerMock).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileToken: "customer-token" }),
    );

    turnstile.vm.$emit("expired");
    await wrapper.vm.$nextTick();
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Vui lòng hoàn tất xác minh bảo mật.");

    turnstile.vm.$emit("verified", "new-token");
    turnstile.vm.$emit("error");
    await wrapper.vm.$nextTick();
    await wrapper.get("form").trigger("submit");
    expect(wrapper.text()).toContain("Vui lòng hoàn tất xác minh bảo mật.");
  });
});
