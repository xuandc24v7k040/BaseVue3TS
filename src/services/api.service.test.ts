// @vitest-environment happy-dom

import { QueryClient } from "@tanstack/vue-query";
import { AxiosError } from "axios";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupHttpClient } from "@/api/http/client";
import { setupApiInterceptors } from "@/services/api.service";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";
import { useStorefrontBranchStore } from "@/stores/storefront-branch.store";
import { toast } from "vue-sonner";

vi.mock("vue-sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@/api/http/client", () => ({
  apiClient: {},
  setupHttpClient: vi.fn(),
}));

vi.mock("@/api/modules/auth.api", () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}));

const setupClient = vi.mocked(setupHttpClient);

function sessionExpiredError(): AxiosError {
  return new AxiosError("expired", undefined, undefined, undefined, {
    data: { statusCode: 401 },
    status: 401,
    statusText: "Unauthorized",
    headers: {},
    config: { headers: {} } as never,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("application auth lifecycle bridge", () => {
  it("uses the storefront branch for customer branch-scoped requests", () => {
    const pinia = createPinia();
    const authStore = useAuthStore(pinia);
    const branchStore = useBranchStore(pinia);
    const storefrontBranchStore = useStorefrontBranchStore(pinia);
    authStore.$patch({ user: { type: "CUSTOMER" } as never });
    branchStore.$patch({ selectedBranchId: "staff-branch" });
    storefrontBranchStore.$patch({ selectedBranchId: "storefront-branch" });

    setupApiInterceptors(pinia);

    const getSelectedBranchId =
      setupClient.mock.calls[0]?.[0]?.getSelectedBranchId;
    expect(getSelectedBranchId?.()).toBe("storefront-branch");
  });

  it("marks the session expired and clears only auth-sensitive queries", () => {
    const pinia = createPinia();
    const queryClient = new QueryClient();
    const store = useAuthStore(pinia);
    const markSessionExpired = vi.spyOn(store, "markSessionExpired");
    const removeQueries = vi.spyOn(queryClient, "removeQueries");
    const logout = vi.spyOn(store, "logout");
    localStorage.setItem("bookora.session_hint", "1");

    setupApiInterceptors(pinia, { queryClient });
    const options = setupClient.mock.calls[0]?.[0];
    options?.onSessionExpired?.(sessionExpiredError());

    expect(markSessionExpired).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ["auth", "me"] });
    expect(localStorage.getItem("bookora.session_hint")).toBeNull();
  });

  it("redirects protected routes without calling logout", async () => {
    const pinia = createPinia();
    const queryClient = new QueryClient();
    const store = useAuthStore(pinia);
    const logout = vi.spyOn(store, "logout");
    const replace = vi.fn().mockResolvedValue(undefined);
    const router = {
      currentRoute: {
        value: {
          path: "/super-admin/dashboard",
          fullPath: "/super-admin/dashboard",
        },
      },
      replace,
    };

    setupApiInterceptors(pinia, { queryClient, router: router as never });
    setupClient.mock.calls[0]?.[0]?.onSessionExpired?.(sessionExpiredError());
    await Promise.resolve();

    expect(replace).toHaveBeenCalledWith({
      name: "admin-login",
      query: { redirect: "/super-admin/dashboard" },
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it("redirects an expired Member Center session to customer login", async () => {
    const pinia = createPinia();
    const replace = vi.fn().mockResolvedValue(undefined);
    const router = {
      currentRoute: {
        value: {
          path: "/account/profile",
          fullPath: "/account/profile?tab=info",
        },
      },
      replace,
    };

    setupApiInterceptors(pinia, { router: router as never });
    setupClient.mock.calls[0]?.[0]?.onSessionExpired?.(sessionExpiredError());
    await Promise.resolve();

    expect(replace).toHaveBeenCalledWith({
      name: "customer-login",
      query: { redirect: "/account/profile?tab=info" },
    });
  });

  it("does not expire the session for transient refresh failures", () => {
    const pinia = createPinia();
    const store = useAuthStore(pinia);
    const markSessionExpired = vi.spyOn(store, "markSessionExpired");

    setupApiInterceptors(pinia);
    setupClient.mock.calls[0]?.[0]?.onSessionExpired?.(
      new AxiosError("Network Error"),
    );

    expect(markSessionExpired).not.toHaveBeenCalled();
  });

  it("deduplicates invalid-branch recovery, clears selection and redirects", async () => {
    const pinia = createPinia();
    const branchStore = useBranchStore(pinia);
    branchStore.initialize({
      id: "01K0000000000000000000000A",
      email: "branch@example.com",
      fullName: "Branch actor",
      phone: null,
      gender: null,
      birthday: null,
      avatarUrl: null,
      type: "BRANCH",
      roles: [],
      permissions: [],
      globalRoles: [],
      globalPermissions: [],
      branchAssignments: [
        {
          branchId: "01K00000000000000000000001",
          userBranchId: "01K00000000000000000000002",
          branch: {
            id: "01K00000000000000000000001",
            code: "ptx",
            name: "PTX",
            isPrimary: true,
          },
          isPrimary: true,
          isActive: true,
          roles: [],
          permissions: ["staff.read"],
          maxRoleLevel: 30,
        },
      ],
      maxRoleLevel: 0,
      isSuperAdmin: false,
      branches: [
        {
          id: "01K00000000000000000000001",
          code: "ptx",
          name: "PTX",
          isPrimary: true,
        },
      ],
      primaryBranchId: "01K00000000000000000000001",
    });
    const clearSelectedBranch = vi.spyOn(branchStore, "clearSelectedBranch");
    const replace = vi.fn().mockResolvedValue(undefined);
    const router = {
      currentRoute: {
        value: {
          path: "/branch-admin/staff",
          fullPath: "/branch-admin/staff?page=2",
        },
      },
      replace,
    };

    setupApiInterceptors(pinia, { router: router as never });
    const recover = setupClient.mock.calls[0]?.[0]?.onBranchScopeForbidden;
    recover?.(new AxiosError("Forbidden"));
    recover?.(new AxiosError("Forbidden"));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(clearSelectedBranch).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith({
      name: "branch-required",
      query: { redirect: "/branch-admin/staff?page=2" },
    });
  });
});
