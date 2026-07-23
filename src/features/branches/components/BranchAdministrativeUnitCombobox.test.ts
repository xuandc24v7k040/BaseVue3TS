// @vitest-environment happy-dom

import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BranchAdministrativeUnitCombobox from "./BranchAdministrativeUnitCombobox.vue";

const WrapperStub = defineComponent({ template: "<div><slot /></div>" });

function mountCombobox(
  overrides: Partial<InstanceType<typeof BranchAdministrativeUnitCombobox>["$props"]> = {},
) {
  return mount(BranchAdministrativeUnitCombobox, {
    props: {
      modelValue: null,
      options: [
        { code: 1, name: "Thành phố Hà Nội" },
        { code: 92, name: "Thành phố Cần Thơ" },
      ],
      placeholder: "Chọn tỉnh/thành phố",
      searchPlaceholder: "Tìm tỉnh/thành phố...",
      ...overrides,
    },
    global: {
      stubs: {
        Popover: WrapperStub,
        PopoverContent: WrapperStub,
        PopoverTrigger: WrapperStub,
        ScrollArea: WrapperStub,
      },
    },
  });
}

describe("BranchAdministrativeUnitCombobox", () => {
  it("searches normalized Province/Ward names and supports keyboard selection", async () => {
    const wrapper = mountCombobox();
    const search = wrapper.get('input[placeholder="Tìm tỉnh/thành phố..."]');
    await search.setValue("can tho");

    expect(wrapper.text()).toContain("Thành phố Cần Thơ");
    expect(wrapper.text()).not.toContain("Thành phố Hà Nội");
    await search.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([92]);
  });

  it("renders loading, empty and error states", async () => {
    const wrapper = mountCombobox({ loading: true });
    expect(wrapper.text()).toContain("Đang tải...");

    await wrapper.setProps({ loading: false, options: [] });
    expect(wrapper.text()).toContain("Không tìm thấy kết quả.");

    await wrapper.setProps({ error: true });
    expect(wrapper.text()).toContain("Không thể tải danh mục hành chính.");
    expect(wrapper.text()).toContain("Thử lại");
  });

  it("forwards invalid and disabled state to the combobox trigger", () => {
    const wrapper = mountCombobox({ invalid: true, disabled: true });
    const trigger = wrapper.get('[role="combobox"]');
    expect(trigger.attributes("aria-invalid")).toBe("true");
    expect(trigger.attributes("disabled")).toBeDefined();
  });
});
