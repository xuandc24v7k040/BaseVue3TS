// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VariantPromotionWeightFields from "./VariantPromotionWeightFields.vue";

const baseProps = {
  idPrefix: "variant-layout",
  salePrice: "70000",
  saleStartAt: "2026-01-01T00:00",
  saleEndAt: "2026-12-31T23:59",
  weightGram: "350",
};

describe("VariantPromotionWeightFields", () => {
  it("renders promotion dates then weight in the responsive three-column grid", () => {
    const wrapper = mount(VariantPromotionWeightFields, { props: baseProps });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "items-start",
        "md:grid-cols-2",
        "xl:grid-cols-3",
      ]),
    );
    expect(wrapper.findAll("input").map((input) => input.attributes("id"))).toEqual([
      "variant-layout-saleStartAt",
      "variant-layout-saleEndAt",
      "variant-layout-weightGram",
    ]);
    expect(wrapper.get('label[for="variant-layout-weightGram"]').classes()).toEqual(
      expect.arrayContaining(["text-xs", "font-normal", "leading-4"]),
    );
    expect(wrapper.get('label[for="variant-layout-weightGram"]').element.parentElement?.classList).toContain(
      "space-y-0",
    );
  });

  it("keeps the weight inline error isolated and emits positive input immediately", async () => {
    const wrapper = mount(VariantPromotionWeightFields, {
      props: {
        ...baseProps,
        weightGram: "",
        weightError: "Trọng lượng là bắt buộc.",
      },
    });

    const weightInput = wrapper.get("#variant-layout-weightGram");
    expect(weightInput.attributes("aria-invalid")).toBe("true");
    expect(wrapper.text()).toContain("Trọng lượng là bắt buộc.");

    await weightInput.setValue("350");
    expect(wrapper.emitted("update:weight")?.at(-1)).toEqual(["350"]);
  });

  it("hides unused promotion dates without stretching the weight input", () => {
    const wrapper = mount(VariantPromotionWeightFields, {
      props: { ...baseProps, salePrice: "" },
    });

    expect(wrapper.findAll("input")).toHaveLength(1);
    expect(wrapper.get("input").attributes("id")).toBe(
      "variant-layout-weightGram",
    );
  });
});
