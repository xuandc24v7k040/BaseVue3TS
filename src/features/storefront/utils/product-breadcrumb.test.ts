import { describe, expect, it } from "vitest";
import type { PublicProductDetailDto } from "@/api/generated/models";
import { buildPrimaryCategoryBreadcrumb } from "./product-breadcrumb";

const category = (
  id: string,
  name: string,
  slug: string,
): PublicProductDetailDto["categories"][number] => ({
  id,
  name,
  slug,
  imageUrl: null,
  sortOrder: 0,
  children: [],
});

function product(
  primaryCategory: PublicProductDetailDto["primaryCategory"],
): Pick<PublicProductDetailDto, "categories" | "primaryCategory"> {
  return {
    categories: [
      category("secondary-1", "Tiểu thuyết", "tieu-thuyet"),
      category("primary", "Manga - Comic", "manga-comic"),
      category("secondary-2", "Sách thiếu nhi", "sach-thieu-nhi"),
    ],
    primaryCategory,
  };
}

describe("buildPrimaryCategoryBreadcrumb", () => {
  it("uses only the parent and primary category, ignoring secondary categories", () => {
    const items = buildPrimaryCategoryBreadcrumb(
      product({
        id: "primary",
        name: "Manga - Comic",
        slug: "manga-comic",
        parent: {
          id: "parent",
          name: "Văn học",
          slug: "van-hoc",
        },
      }),
    );

    expect(items).toEqual([
      {
        id: "parent",
        label: "Văn học",
        to: { path: "/books", query: { category: "van-hoc" } },
      },
      {
        id: "primary",
        label: "Manga - Comic",
        to: { path: "/books", query: { category: "manga-comic" } },
      },
    ]);
    expect(items.map((item) => item.label)).not.toContain("Tiểu thuyết");
    expect(items.map((item) => item.label)).not.toContain("Sách thiếu nhi");
  });

  it("renders only the primary category when it is a root category", () => {
    expect(
      buildPrimaryCategoryBreadcrumb(
        product({
          id: "primary",
          name: "Văn học",
          slug: "van-hoc",
          parent: null,
        }),
      ),
    ).toEqual([
      {
        id: "primary",
        label: "Văn học",
        to: { path: "/books", query: { category: "van-hoc" } },
      },
    ]);
  });

  it("returns the safe minimal fallback when no primary category exists", () => {
    expect(buildPrimaryCategoryBreadcrumb(product(null))).toEqual([]);
  });

  it("does not duplicate a malformed parent matching the primary category", () => {
    const items = buildPrimaryCategoryBreadcrumb(
      product({
        id: "primary",
        name: "Văn học",
        slug: "van-hoc",
        parent: {
          id: "primary",
          name: "Văn học",
          slug: "van-hoc",
        },
      }),
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe("Văn học");
  });
});
