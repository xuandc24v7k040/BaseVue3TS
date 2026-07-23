// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import CustomerAccountSidebar from "@/components/client/layout/CustomerAccountSidebar.vue";
import AccountAddressesPage from "./AccountAddressesPage.vue";
import AccountOverviewPage from "./AccountOverviewPage.vue";
import AccountProfilePage from "./AccountProfilePage.vue";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import { vietnamAdministrativeKeys } from "@/features/branches/composables/use-vietnam-administrative-units";
import { useAuthStore } from "@/stores/auth.store";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/account/:pathMatch(.*)*", component: { template: "<div />" } },
  ],
});

function mountAccount(
  component:
    | typeof CustomerAccountSidebar
    | typeof AccountOverviewPage
    | typeof AccountProfilePage
    | typeof AccountAddressesPage,
) {
  const pinia = createPinia();
  const authStore = useAuthStore(pinia);
  authStore.$patch({
    status: "authenticated",
    user: {
      id: "customer-1",
      email: "reader@bookora.vn",
      fullName: "Nguyễn An",
      phone: null,
      gender: null,
      birthday: null,
      avatarUrl: null,
      type: "CUSTOMER",
      roles: [],
      permissions: [],
      globalRoles: [],
      globalPermissions: [],
      branchAssignments: [],
      maxRoleLevel: 0,
      isSuperAdmin: false,
      branches: [],
      primaryBranchId: null,
    },
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const addresses = Array.from({ length: 4 }, (_, index) => ({
    id: `address-${index + 1}`,
    label: index === 0 ? "Nhà" : `Địa chỉ ${index + 1}`,
    recipientName: "Nguyễn An",
    phone: "0901234567",
    provinceCode: 92,
    provinceName: "Cần Thơ",
    wardCode: 31117,
    wardName: "Phường An Bình",
    addressDetail: `Số ${index + 1} đường A`,
    formattedAddress: `Số ${index + 1} đường A, Phường An Bình, Cần Thơ`,
    isDefault: index === 0,
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  }));
  queryClient.setQueryData(customerAccountKeys.addresses(), addresses);
  queryClient.setQueryData(vietnamAdministrativeKeys.provinces(), []);
  queryClient.setQueryData(customerAccountKeys.profile(), {
    id: "customer-1",
    fullName: "Nguyễn An",
    email: "reader@bookora.vn",
    phone: null,
    gender: null,
    birthday: null,
    avatarUrl: null,
    provider: "LOCAL",
    hasLocalPassword: true,
    defaultAddress: addresses[0],
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  });

  return mount(component, {
    global: {
      plugins: [pinia, router, [VueQueryPlugin, { queryClient }]],
    },
  });
}

describe("Member Center Phase 3", () => {
  it("renders the authenticated sidebar principal without mock personal details", () => {
    const wrapper = mountAccount(CustomerAccountSidebar);
    expect(wrapper.get('[data-slot="avatar"]').classes()).toContain("size-18");
    expect(wrapper.text()).toContain("Nguyễn An");
    expect(wrapper.text()).toContain("reader@bookora.vn");
    expect(wrapper.text()).not.toContain("0961518977");
    expect(wrapper.text()).not.toContain("Tham gia Bookora");
    expect(wrapper.text()).not.toContain("F-Point");
  });

  it("renders the approved overview sections and only three stats", () => {
    const wrapper = mountAccount(AccountOverviewPage);
    expect(wrapper.text()).toContain("Việc cần quan tâm");
    expect(wrapper.text()).toContain("Đơn hàng gần đây");
    expect(wrapper.text()).toContain("Sản phẩm yêu thích");
    expect(
      wrapper.findAll('section[aria-label="Thống kê tài khoản"] > *'),
    ).toHaveLength(3);
    expect(wrapper.text()).not.toContain("F-Point");
    expect(wrapper.find('[data-slot="scroll-area"]').exists()).toBe(true);
    expect(wrapper.find(".overflow-x-auto").exists()).toBe(false);
    expect(wrapper.findAll('[data-slot="scroll-area"] article')).toHaveLength(
      4,
    );
  });

  it("renders profile and address source-of-truth content", () => {
    const profile = mountAccount(AccountProfilePage);
    const addresses = mountAccount(AccountAddressesPage);
    expect(profile.text()).toContain("Tài khoản liên kết");
    expect(profile.text()).toContain("Google");
    expect(profile.text()).not.toContain("Zalo");
    expect(addresses.findAll("article")).toHaveLength(4);
    expect(
      addresses.findAll('input[type="checkbox"], input[type="radio"]'),
    ).toHaveLength(0);
    expect(addresses.text()).toContain(
      "Bạn có thể lưu tối đa 10 địa chỉ giao hàng.",
    );
    expect(addresses.find("article").classes()).not.toContain("min-h-64");
    expect(addresses.find("article .mt-auto").exists()).toBe(false);
    expect(addresses.find("article").classes()).toContain("h-full");
    expect(addresses.find("article .flex-1").exists()).toBe(true);
    expect(addresses.find(".auto-rows-fr").exists()).toBe(true);
  });

  it("keeps profile and address sheet footers in two equal columns", async () => {
    const profile = mountAccount(AccountProfilePage);
    await profile.get("button").trigger("click");
    expect(
      document.querySelector('[data-slot="sheet-footer"]')?.className,
    ).toContain("grid-cols-2");
    profile.unmount();

    const addresses = mountAccount(AccountAddressesPage);
    await addresses.get("button").trigger("click");
    expect(
      document.querySelector('[data-slot="sheet-footer"]')?.className,
    ).toContain("grid-cols-2");
  });
});
