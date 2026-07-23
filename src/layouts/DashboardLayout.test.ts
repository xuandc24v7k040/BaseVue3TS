// @vitest-environment happy-dom

import { config, shallowMount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  AuthMeBranchDto,
  AuthMeResponseDto,
} from "@/api/generated/models";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

const BRANCH_A = "01K00000000000000000000001";
const BRANCH_B = "01K00000000000000000000002";

function branch(id: string, name: string): AuthMeBranchDto {
  return { id, code: name.toLowerCase(), name, isPrimary: false };
}

function user(
  type: AuthMeResponseDto["type"],
  branches: AuthMeBranchDto[],
): AuthMeResponseDto {
  return {
    id: "01K0000000000000000000000A",
    email: "admin@example.com",
    fullName: "Admin",
    phone: null,
    gender: null,
    birthday: null,
    avatarUrl: null,
    type,
    roles: [],
    permissions: [],
    globalRoles: [],
    globalPermissions: [],
    branchAssignments:
      type === "BRANCH"
        ? branches.map((item, index) => ({
            branchId: item.id,
            userBranchId: `assignment-${item.id}`,
            branch: item,
            isPrimary: index === 0,
            isActive: true,
            roles: [],
            permissions: [],
            maxRoleLevel: 0,
          }))
        : [],
    maxRoleLevel: 0,
    isSuperAdmin: type === "SYSTEM",
    branches,
    primaryBranchId: type === "BRANCH" ? (branches[0]?.id ?? null) : null,
  };
}

function mountLayout(principal: AuthMeResponseDto) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const authStore = useAuthStore();
  authStore.$patch({ status: "authenticated", user: principal });
  useBranchStore().initialize(principal);

  return shallowMount(DashboardLayout, {
    global: {
      plugins: [pinia],
      stubs: {
        AppSidebar: true,
        RouterView: true,
      },
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  config.global.renderStubDefaultSlot = true;
});

afterEach(() => {
  config.global.renderStubDefaultSlot = false;
});

describe("admin branch selector", () => {
  it("shows system scope and real active branches for SYSTEM users", async () => {
    const principal = user("SYSTEM", [
      branch(BRANCH_A, "Cần Thơ"),
      branch(BRANCH_B, "Hậu Giang"),
    ]);
    const wrapper = mountLayout(principal);

    expect(wrapper.text()).toContain("Toàn hệ thống");
    expect(wrapper.text()).toContain("Cần Thơ");
    expect(wrapper.text()).toContain("Hậu Giang");

    await useBranchStore().setSelectedBranch(BRANCH_B);
    await nextTick();
    expect(wrapper.text()).toContain("Hậu Giang");
  });

  it("shows only assigned branches and no system option for BRANCH users", () => {
    const wrapper = mountLayout(user("BRANCH", [branch(BRANCH_A, "Cần Thơ")]));

    expect(wrapper.text()).toContain("Cần Thơ");
    expect(wrapper.text()).not.toContain("Toàn hệ thống");
    expect(wrapper.text()).not.toContain("Hậu Giang");
  });

  it("shows a clear empty state when no branch is assigned", () => {
    const wrapper = mountLayout(user("BRANCH", []));
    expect(wrapper.text()).toContain("Chưa được phân công chi nhánh");
  });
});
