import { describe, expect, it } from "vitest";
import { toCategorySlugPreview } from "./category-slug";

describe("toCategorySlugPreview", () => {
  it("matches the backend Vietnamese slug policy", () => {
    expect(toCategorySlugPreview("  Sách Đời & Kinh tế  ")).toBe(
      "sach-doi-kinh-te",
    );
  });

  it("includes the selected parent scope for child previews", () => {
    expect(toCategorySlugPreview("Kinh tế", "Tiểu sử - Hồi ký")).toBe(
      "tieu-su-hoi-ky-kinh-te",
    );
  });
});
