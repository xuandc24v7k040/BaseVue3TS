import { describe, expect, it } from "vitest";
import {
  assignExistingStaffSchema,
  staffCreateSchema,
} from "./staff-create.schema";

describe("Staff form schemas", () => {
  it("returns Vietnamese errors and validates confirmation and roles", () => {
    const result = staffCreateSchema.safeParse({
      fullName: "",
      email: "x",
      phone: "abc",
      password: "123",
      confirmPassword: "456",
      roleIds: [],
      permissionIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map(({ message }) => message)).toEqual(
        expect.arrayContaining([
          "Vui lòng nhập họ tên.",
          "Email không đúng định dạng.",
          "Số điện thoại không đúng định dạng.",
          "Mật khẩu phải có ít nhất 8 ký tự.",
          "Mật khẩu xác nhận không khớp.",
          "Vui lòng chọn ít nhất một vai trò nhân viên.",
        ]),
      );
  });

  it("requires a candidate and at least one role for add-existing", () => {
    expect(
      assignExistingStaffSchema.safeParse({
        userId: "",
        roleIds: [],
        permissionIds: [],
      }).success,
    ).toBe(false);
  });
});
