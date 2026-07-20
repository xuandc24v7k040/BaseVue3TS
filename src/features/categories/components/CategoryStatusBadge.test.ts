// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CategoryStatusBadge from "./CategoryStatusBadge.vue";

describe("CategoryStatusBadge", () => {
  it("renders active state as green text without badge styling", () => {
    const wrapper = mount(CategoryStatusBadge, { props: { active: true } });
    expect(wrapper.text()).toBe("Đang hoạt động");
    expect(wrapper.find("span").classes()).toContain("text-emerald-600");
    expect(wrapper.find("[data-slot='badge']").exists()).toBe(false);
  });

  it("renders inactive state as red text", () => {
    const wrapper = mount(CategoryStatusBadge, { props: { active: false } });
    expect(wrapper.text()).toBe("Tạm ẩn");
    expect(wrapper.find("span").classes()).toContain("text-red-600");
  });
});
