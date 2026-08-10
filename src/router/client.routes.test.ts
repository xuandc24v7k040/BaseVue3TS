// @vitest-environment happy-dom

import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import { routes } from "@/router";
import { clientRoutes } from "@/router/client.routes";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  });
}

function makeLegacyCatalogRouter() {
  const children = clientRoutes[0]?.children ?? [];
  const legacyList = children.find((route) => route.path === "books");
  const legacyDetail = children.find((route) => route.path === "books/:slug");
  if (!legacyList?.redirect || !legacyDetail?.redirect) {
    throw new Error("Legacy catalog redirects are not configured.");
  }

  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/san-pham", name: "client-book-list", component: {} },
      {
        path: "/san-pham/:slug",
        name: "client-book-detail",
        component: {},
      },
      { path: "/books", redirect: legacyList.redirect },
      { path: "/books/:slug", redirect: legacyDetail.redirect },
    ],
  });
}

describe("client route scaffold", () => {
  it.each([
    ["/", "client-home"],
    ["/login", "customer-login"],
    ["/auth/callback", "customer-auth-callback"],
    ["/account/addresses", "customer-account-addresses"],
    ["/account/profile", "customer-account-profile"],
    ["/san-pham", "client-book-list"],
    ["/san-pham/sach-thu-nghiem", "client-book-detail"],
  ])("resolves %s as %s", (path, routeName) => {
    const resolved = makeRouter().resolve(path);

    expect(resolved.name).toBe(routeName);
    expect(resolved.redirectedFrom).toBeUndefined();
    if (path.startsWith("/account")) {
      expect(resolved.meta.requiresAuth).toBe(true);
      expect(resolved.meta.allowedUserTypes).toContain("CUSTOMER");
    } else {
      expect(resolved.meta.skipAuthBootstrap).toBe(true);
    }
  });

  it.each([
    ["/admin/login", "admin-login"],
    ["/super-admin/dashboard", "super-admin-dashboard"],
    ["/branch-admin/dashboard", "branch-admin-dashboard"],
  ])("preserves the existing admin route %s", (path, routeName) => {
    expect(makeRouter().resolve(path).name).toBe(routeName);
  });

  it("keeps the catch-all route active", () => {
    expect(makeRouter().resolve("/route-khong-ton-tai").name).toBe("not-found");
  });

  it("redirects the legacy rewards route to profile", async () => {
    const router = makeRouter();
    await router.push("/account/rewards");
    expect(router.currentRoute.value.name).toBe("customer-account-profile");
  });

  it("redirects legacy catalog paths while preserving params, query and hash", async () => {
    const router = makeLegacyCatalogRouter();

    await router.push("/books?page=2&sort=price_asc#ket-qua");
    expect(router.currentRoute.value.fullPath).toBe(
      "/san-pham?page=2&sort=price_asc#ket-qua",
    );

    await router.push("/books/sach-thu-nghiem?ref=legacy#chi-tiet");
    expect(router.currentRoute.value.fullPath).toBe(
      "/san-pham/sach-thu-nghiem?ref=legacy#chi-tiet",
    );
  });
});
