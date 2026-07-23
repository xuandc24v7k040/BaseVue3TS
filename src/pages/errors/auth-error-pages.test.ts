// @vitest-environment happy-dom

import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import type { AuthMeResponseDto } from "@/api/generated/models";
import AccessDeniedPage from "@/pages/errors/AccessDeniedPage.vue";
import AuthUnavailablePage from "@/pages/errors/AuthUnavailablePage.vue";
import { useAuthStore } from "@/stores/auth.store";

const toastError = vi.hoisted(() => vi.fn());

vi.mock("vue-sonner", () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock("@/api/modules/auth.api", () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}));

function makeUser(type: AuthMeResponseDto["type"]): AuthMeResponseDto {
  return {
    id: "01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T",
    email: "customer@example.com",
    fullName: "Bookora Customer",
    phone: null,
    gender: null,
    birthday: null,
    avatarUrl: null,
    type,
    roles: [],
    permissions: [],
    globalRoles: [],
    globalPermissions: [],
    branchAssignments: [],
    maxRoleLevel: 0,
    isSuperAdmin: type === "SYSTEM",
    branches: [],
    primaryBranchId: null,
  };
}

async function setup(path: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/admin/login", name: "admin-login", component: {} },
      {
        path: "/access-denied",
        name: "access-denied",
        component: AccessDeniedPage,
      },
      {
        path: "/auth-unavailable",
        name: "auth-unavailable",
        component: AuthUnavailablePage,
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
  await router.push(path);
  await router.isReady();
  const queryClient = new QueryClient();
  const store = useAuthStore(pinia);
  return { pinia, queryClient, router, store };
}

beforeEach(() => {
  toastError.mockReset();
});

describe("AccessDenied page", () => {
  it("shows the authenticated CUSTOMER without changing the session", async () => {
    const context = await setup("/access-denied");
    context.store.status = "authenticated";
    context.store.user = makeUser("CUSTOMER");

    const wrapper = mount(AccessDeniedPage, {
      global: {
        plugins: [
          context.pinia,
          context.router,
          [VueQueryPlugin, { queryClient: context.queryClient }],
        ],
      },
    });

    expect(wrapper.text()).toContain(
      "Bạn đã đăng nhập thành công, nhưng tài khoản này không có quyền truy cập",
    );
    expect(wrapper.text()).toContain("customer@example.com");
    expect(context.store.status).toBe("authenticated");
  });
});

describe("AuthUnavailable page", () => {
  it("retries and routes an authenticated BRANCH principal", async () => {
    const context = await setup(
      "/auth-unavailable?redirect=/branch-admin/dashboard",
    );
    vi.spyOn(context.store, "retryBootstrap").mockImplementation(async () => {
      context.store.status = "authenticated";
      context.store.user = makeUser("BRANCH");
    });

    const wrapper = mount(AuthUnavailablePage, {
      global: {
        plugins: [context.pinia, context.router],
      },
    });
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(context.store.retryBootstrap).toHaveBeenCalledOnce();
    expect(context.router.currentRoute.value.path).toBe(
      "/branch-admin/dashboard",
    );
  });

  it("keeps unknown state and reports another unavailable result", async () => {
    const context = await setup("/auth-unavailable");
    context.store.status = "unknown";
    vi.spyOn(context.store, "retryBootstrap").mockResolvedValue();

    const wrapper = mount(AuthUnavailablePage, {
      global: {
        plugins: [context.pinia, context.router],
      },
    });
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(context.router.currentRoute.value.path).toBe("/auth-unavailable");
    expect(context.store.status).toBe("unknown");
    expect(toastError).toHaveBeenCalledOnce();
  });

  it("goes to login without forcing unknown state to anonymous", async () => {
    const context = await setup("/auth-unavailable");
    context.store.status = "unknown";
    const wrapper = mount(AuthUnavailablePage, {
      global: {
        plugins: [context.pinia, context.router],
      },
    });

    await wrapper.findAll("button")[1]?.trigger("click");
    await flushPromises();

    expect(context.router.currentRoute.value.path).toBe("/admin/login");
    expect(context.store.status).toBe("unknown");
  });
});
