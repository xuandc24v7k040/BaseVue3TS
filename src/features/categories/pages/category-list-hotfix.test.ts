import { describe, expect, it } from "vitest";
import categoryListPageSource from "./CategoryListPage.vue?raw";

describe("CategoryListPage pagination contract", () => {
  it("uses the shared non-paginated row-count footer without paging the tree API", () => {
    expect(categoryListPageSource).toContain(':enable-pagination="false"');
    expect(categoryListPageSource).toContain(':show-row-count="true"');
    expect(categoryListPageSource).toContain('<template #row-count="{ rowCount }">');
    expect(categoryListPageSource).not.toContain(':page-count=');
  });
});
