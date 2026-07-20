import { describe, expect, it } from "vitest";
import { categoryFormSchema } from "./category-form.schema";

const valid = {
  name: "Văn học",
  description: "",
  parentId: null,
  type: "NORMAL",
  isActive: true,
  sortOrder: 0,
};

describe("categoryFormSchema", () => {
  it("accepts a valid category without exposing slug or image URL fields", () => {
    const result = categoryFormSchema.parse(valid);
    expect(result).not.toHaveProperty("slug");
    expect(result).not.toHaveProperty("imageUrl");
  });

  it("rejects short names and invalid ordering", () => {
    expect(
      categoryFormSchema.safeParse({ ...valid, name: "A", sortOrder: -1 })
        .success,
    ).toBe(false);
  });
});
