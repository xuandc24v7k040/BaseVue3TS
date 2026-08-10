import { describe, expect, it } from "vitest";
import { buttonVariants } from ".";

describe("buttonVariants", () => {
  it("keeps destructive actions solid in both light and dark states", () => {
    const classes = buttonVariants({ variant: "destructive" }).split(/\s+/);

    expect(classes).toContain("bg-destructive");
    expect(classes).toContain("dark:bg-destructive");
    expect(classes).toContain("dark:hover:bg-destructive/90");
    expect(classes).not.toContain("dark:bg-destructive/60");
    expect(classes).toContain("disabled:opacity-50");
  });
});
