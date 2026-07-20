import { describe, expect, it } from "vitest";
import { toCategoryPayload } from "./category-form.adapter";

describe("toCategoryPayload", () => {
  it("trims form values and never sends a client-controlled slug", () => {
    const payload = toCategoryPayload({
      name: "  Kinh tế  ",
      description: "  Mô tả  ",
      parentId: null,
      type: "NORMAL",
      isActive: true,
      sortOrder: 2,
    });

    expect(payload).toEqual({
      name: "Kinh tế",
      description: "Mô tả",
      parentId: null,
      type: "NORMAL",
      isActive: true,
      sortOrder: 2,
    });
    expect(payload).not.toHaveProperty("slug");
  });
});
