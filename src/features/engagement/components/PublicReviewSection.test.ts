// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicReviewSection from "@/features/engagement/components/PublicReviewSection.vue";

vi.mock("@tanstack/vue-query", async () => {
  const { ref } = await import("vue");
  return {
    useQuery: () => ({
      data: ref({
        items: [],
        averageRating: 0,
        reviewCount: 0,
        ratingDistribution: [],
        totalPages: 0,
      }),
      isPending: ref(false),
      isFetching: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    }),
  };
});

describe("PublicReviewSection filters", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("applies the subtle selected state consistently to every filter", async () => {
    const wrapper = mount(PublicReviewSection, {
      props: { productId: "01J00000000000000000000000" },
      attachTo: document.body,
    });
    const radios = wrapper.findAll('[role="radio"]');
    const labels = wrapper.findAll('label');

    expect(radios).toHaveLength(7);
    expect(labels.map((label) => label.text().trim())).toEqual([
      "Tất cả",
      "Đã mua hàng",
      "5 sao",
      "4 sao",
      "3 sao",
      "2 sao",
      "1 sao",
    ]);

    for (const [index, radio] of radios.entries()) {
      await radio.trigger("click");
      expect(radio.attributes("data-state")).toBe("checked");
      expect(labels[index]?.classes()).toContain("font-semibold");
      expect(labels[index]?.classes()).toContain(
        "border-[var(--bookora-green)]/45",
      );
    }
  });
});
