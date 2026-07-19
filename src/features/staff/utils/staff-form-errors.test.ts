import { describe, expect, it } from "vitest";
import { normalizeFieldErrors } from "./staff-form-errors";

describe("normalizeFieldErrors", () => {
  it("keeps one normalized message per allowed field", () => {
    expect(
      normalizeFieldErrors(
        {
          roleIds: [
            "  Vui lòng chọn ít nhất một vai trò nhân viên.  ",
            "Vui lòng chọn ít nhất một vai trò nhân viên.",
          ],
          root: ["Không hợp lệ"],
        },
        ["roleIds"] as const,
      ),
    ).toEqual({
      roleIds: "Vui lòng chọn ít nhất một vai trò nhân viên.",
    });
  });

  it("does not accumulate messages across repeated normalization", () => {
    const response = {
      roleIds: ["Vui lòng chọn ít nhất một vai trò nhân viên."],
    };
    expect(normalizeFieldErrors(response, ["roleIds"] as const)).toEqual(
      normalizeFieldErrors(response, ["roleIds"] as const),
    );
  });
});
