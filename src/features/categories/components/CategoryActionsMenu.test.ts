// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { CategoryTreeNode } from "../types";
import CategoryActionsMenu from "./CategoryActionsMenu.vue";

const menuStubs = {
  DropdownMenu: { template: "<div><slot /></div>" },
  DropdownMenuTrigger: { template: "<div><slot /></div>" },
  DropdownMenuContent: { template: "<div><slot /></div>" },
  DropdownMenuItem: {
    emits: ["select"],
    template: '<button type="button" @click="$emit(\'select\')"><slot /></button>',
  },
  DropdownMenuSeparator: { template: "<hr />" },
};

function category(level: 1 | 2): CategoryTreeNode {
  return {
    id: `01J0000000000000000000000${level}`,
    name: level === 1 ? "Kinh tế" : "Kinh tế học",
    slug: level === 1 ? "kinh-te" : "kinh-te-hoc",
    description: null,
    parentId: level === 1 ? null : "01J00000000000000000000001",
    type: "NORMAL",
    imageUrl: null,
    isActive: true,
    effectiveActive: true,
    sortOrder: 0,
    level,
    childrenCount: 0,
    productCount: 0,
    parent: null,
    children: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("CategoryActionsMenu", () => {
  it("shows quick add child only for a root with create permission", () => {
    const wrapper = mount(CategoryActionsMenu, {
      props: {
        category: category(1),
        canCreate: true,
        canUpdate: false,
        canDelete: false,
      },
      global: { stubs: menuStubs },
    });

    expect(wrapper.text()).toContain("Thêm danh mục con");
  });

  it("does not show quick add child for a child row", () => {
    const wrapper = mount(CategoryActionsMenu, {
      props: {
        category: category(2),
        canCreate: true,
        canUpdate: false,
        canDelete: false,
      },
      global: { stubs: menuStubs },
    });

    expect(wrapper.text()).not.toContain("Thêm danh mục con");
  });
});
