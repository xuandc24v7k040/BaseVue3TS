import { describe, expect, it } from "vitest";
import {
  formatSuggestionMetadata,
  highlightSearchText,
} from "@/features/storefront/components/search-suggestion-display";

const title = "Chú Thuật Hồi Chiến";

describe("search suggestion display helpers", () => {
  it.each([
    ["chú", "Chú"],
    ["chu", "Chú"],
    ["chu thuat", "Chú Thuật"],
    ["thuat", "Thuật"],
    ["thuật", "Thuật"],
    ["CHU THUAT", "Chú Thuật"],
  ])("highlights %s against original Vietnamese text", (query, expected) => {
    const segments = highlightSearchText(title, query);
    expect(segments.filter((segment) => segment.matched)).toEqual([
      { text: expected, matched: true },
    ]);
    expect(segments.map((segment) => segment.text).join("")).toBe(title);
  });

  it("formats author and publisher with a fallback for each missing value", () => {
    expect(
      formatSuggestionMetadata({
        authors: [{ id: "author", name: "J. K. Rowling", slug: "j-k-rowling" }],
        publisher: { id: "publisher", name: "Nhà xuất bản Kim Đồng", slug: "kim-dong" },
      }),
    ).toBe("J. K. Rowling · Nhà xuất bản Kim Đồng");
    expect(
      formatSuggestionMetadata({
        authors: [{ id: "author", name: "J. K. Rowling", slug: "j-k-rowling" }],
        publisher: null,
      }),
    ).toBe("J. K. Rowling · Đang cập nhật");
    expect(
      formatSuggestionMetadata({
        authors: [],
        publisher: { id: "publisher", name: "Nhà xuất bản Kim Đồng", slug: "kim-dong" },
      }),
    ).toBe("Đang cập nhật · Nhà xuất bản Kim Đồng");
    expect(formatSuggestionMetadata({ authors: [], publisher: null })).toBe(
      "Đang cập nhật",
    );
  });
});
