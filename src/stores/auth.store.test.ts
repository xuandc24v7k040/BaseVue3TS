// @vitest-environment happy-dom

import { AxiosError } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthMeResponseDto } from "@/api/generated/models";
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutCurrentAccount,
} from "@/api/modules/auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

vi.mock("@/api/modules/auth.api", () => ({
  fetchCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logoutCurrentAccount: vi.fn(),
}));

const fetchMe = vi.mocked(fetchCurrentUser);
const loginRequest = vi.mocked(loginWithPassword);
const logoutRequest = vi.mocked(logoutCurrentAccount);

function makeUser(
  type: AuthMeResponseDto["type"] = "SYSTEM",
): AuthMeResponseDto {
  return {
    id: "01JY7M9M9Z4Y7Y7K7QZJ9Y4S4T",
    email: "admin@example.com",
    fullName: "Bookora Admin",
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

function httpError(status?: number): AxiosError {
  return new AxiosError(
    status ? `HTTP ${status}` : "Network Error",
    undefined,
    undefined,
    undefined,
    status
      ? {
          data: { statusCode: status },
          status,
          statusText: "Error",
          headers: {},
          config: { headers: {} } as never,
        }
      : undefined,
  );
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  localStorage.clear();
});

describe("auth store bootstrap", () => {
  it("starts with an unknown session", () => {
    const store = useAuthStore();

    expect(store.status).toBe("unknown");
    expect(store.user).toBeNull();
    expect(store.isBootstrapping).toBe(false);
    expect(store.bootstrapError).toBeNull();
  });

  it("hydrates an authenticated user from /auth/me", async () => {
    const user = makeUser();
    fetchMe.mockResolvedValue(user);
    const store = useAuthStore();

    await store.ensureBootstrapped();

    expect(store.status).toBe("authenticated");
    expect(store.user).toStrictEqual(user);
    expect(store.bootstrapError).toBeNull();
    expect(useBranchStore().isInitialized).toBe(true);
  });

  it("treats only a final 401 as anonymous", async () => {
    fetchMe.mockRejectedValue(httpError(401));
    const store = useAuthStore();
    localStorage.setItem("bookora.session_hint", "1");

    await store.ensureBootstrapped();

    expect(store.status).toBe("anonymous");
    expect(store.user).toBeNull();
    expect(store.bootstrapError).toBeNull();
    expect(localStorage.getItem("bookora.session_hint")).toBeNull();
  });

  it.each([
    ["network", httpError()],
    ["rate limit", httpError(429)],
    ["server error", httpError(503)],
  ])("keeps status unknown for %s failures", async (_name, error) => {
    fetchMe.mockRejectedValue(error);
    const store = useAuthStore();

    await store.ensureBootstrapped();

    expect(store.status).toBe("unknown");
    expect(store.user).toBeNull();
    expect(store.bootstrapError).toBe(error);
  });

  it("single-flights concurrent bootstrap calls", async () => {
    let resolveUser!: (user: AuthMeResponseDto) => void;
    fetchMe.mockReturnValue(
      new Promise((resolve) => {
        resolveUser = resolve;
      }),
    );
    const store = useAuthStore();

    const first = store.ensureBootstrapped();
    const second = store.ensureBootstrapped();
    resolveUser(makeUser());
    await Promise.all([first, second]);

    expect(fetchMe).toHaveBeenCalledOnce();
  });

  it("clears a failed bootstrap flight and retries", async () => {
    const error = httpError();
    fetchMe.mockRejectedValueOnce(error).mockResolvedValueOnce(makeUser());
    const store = useAuthStore();

    await store.ensureBootstrapped();
    await store.retryBootstrap();

    expect(fetchMe).toHaveBeenCalledTimes(2);
    expect(store.status).toBe("authenticated");
  });
});

describe("auth store session actions", () => {
  it("hydrates login from /auth/me instead of the login response", async () => {
    const me = makeUser();
    loginRequest.mockResolvedValue({
      id: "public-user",
      email: "public@example.com",
      fullName: "Public User",
      type: "SYSTEM",
    });
    fetchMe.mockResolvedValue(me);
    const store = useAuthStore();

    await expect(
      store.login({
        email: "admin@example.com",
        password: "password1",
      }),
    ).resolves.toBe(me);

    expect(loginRequest).toHaveBeenCalledOnce();
    expect(fetchMe).toHaveBeenCalledOnce();
    expect(store.user).toStrictEqual(me);
    expect(localStorage.getItem("bookora.session_hint")).toBe("1");
  });

  it("keeps login transient /auth/me failures unknown and rethrows the cause", async () => {
    const error = httpError(503);
    loginRequest.mockResolvedValue({} as never);
    fetchMe.mockRejectedValue(error);
    const store = useAuthStore();

    await expect(
      store.login({
        email: "admin@example.com",
        password: "password1",
      }),
    ).rejects.toBe(error);

    expect(store.status).toBe("unknown");
    expect(store.bootstrapError).toBe(error);
  });

  it("allows CUSTOMER principals to be authenticated", async () => {
    fetchMe.mockResolvedValue(makeUser("CUSTOMER"));
    const store = useAuthStore();

    await store.ensureBootstrapped();

    expect(store.status).toBe("authenticated");
    expect(store.user?.type).toBe("CUSTOMER");
  });

  it("marks an expired session anonymous without calling logout", () => {
    const store = useAuthStore();
    useBranchStore().initialize(makeUser());
    localStorage.setItem("bookora.session_hint", "1");
    store.markSessionExpired();

    expect(store.status).toBe("anonymous");
    expect(store.user).toBeNull();
    expect(logoutRequest).not.toHaveBeenCalled();
    expect(localStorage.getItem("bookora.session_hint")).toBeNull();
    expect(useBranchStore().isInitialized).toBe(false);
  });

  it("removes the session hint after confirmed logout", async () => {
    const store = useAuthStore();
    useBranchStore().initialize(makeUser());
    localStorage.setItem("bookora.session_hint", "1");
    logoutRequest.mockResolvedValue({ success: true });

    await expect(store.logout()).resolves.toEqual({ confirmed: true });
    expect(store.isLogoutNavigationPending).toBe(true);
    store.completeLogoutNavigation();
    expect(store.isLogoutNavigationPending).toBe(false);

    expect(localStorage.getItem("bookora.session_hint")).toBeNull();
    expect(useBranchStore().isInitialized).toBe(false);
  });
});
