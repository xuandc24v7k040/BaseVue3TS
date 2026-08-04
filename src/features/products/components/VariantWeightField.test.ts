// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VariantWeightField from "./VariantWeightField.vue";

describe("VariantWeightField", () => {
  it("renders the required gram field and inline Vietnamese error state", () => {
    const wrapper = mount(VariantWeightField, {
      props: {
        id: "variant-weight",
        modelValue: "",
        error: "Trọng lượng là bắt buộc.",
      },
    });

    const input = wrapper.get("input");
    expect(input.attributes()).toMatchObject({
      min: "1",
      max: "100000",
      step: "1",
      inputmode: "numeric",
      "aria-invalid": "true",
    });
    expect(input.classes()).toContain("border-destructive");
    expect(wrapper.text()).toContain("Trọng lượng là bắt buộc.");
    expect(wrapper.text()).toContain("g");
  });

  it("preserves pasted decimal input so validation can reject it", async () => {
    const wrapper = mount(VariantWeightField, {
      props: { id: "variant-weight", modelValue: "" },
    });

    await wrapper.get("input").setValue("350.5");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["350.5"]);
  });
});
