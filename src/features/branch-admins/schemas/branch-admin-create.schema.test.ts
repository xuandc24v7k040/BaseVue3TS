import { describe, expect, it } from "vitest";
import { toCreateBranchAdminPayload } from "../adapters/branch-admin-form.adapter";
import { branchAdminCreateSchema } from "./branch-admin-create.schema";

describe("Branch Admin create form", () => {
  it("uses Vietnamese validation for required and matching fields", () => {
    const result = branchAdminCreateSchema.safeParse({
      fullName: "",
      email: "bad",
      phone: "",
      password: "short",
      confirmPassword: "other",
      branchIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Họ và tên là bắt buộc.");
      expect(messages).toContain("Email không đúng định dạng.");
      expect(messages).toContain("Mật khẩu phải có ít nhất 8 ký tự.");
      expect(messages).toContain("Mật khẩu nhập lại không khớp.");
      expect(messages).toContain("Vui lòng chọn ít nhất một chi nhánh.");
    }
  });

  it("allowlists the generated request payload and excludes confirmPassword", () => {
    const result = branchAdminCreateSchema.parse({
      fullName: " Admin ",
      email: " admin@example.com ",
      phone: " 0909123456 ",
      password: "password@123",
      confirmPassword: "password@123",
      branchIds: ["branch-id"],
    });
    expect(toCreateBranchAdminPayload(result)).toEqual({
      fullName: "Admin",
      email: "admin@example.com",
      phone: "0909123456",
      password: "password@123",
      branchIds: ["branch-id"],
    });
    expect(toCreateBranchAdminPayload(result)).not.toHaveProperty(
      "confirmPassword",
    );
  });

  it("allows an empty phone but validates its format when provided", () => {
    const validForm = {
      fullName: "Admin",
      email: "admin@example.com",
      password: "password@123",
      confirmPassword: "password@123",
      branchIds: ["branch-id"],
    };

    expect(
      branchAdminCreateSchema.safeParse({ ...validForm, phone: "" }).success,
    ).toBe(true);
    expect(
      branchAdminCreateSchema.safeParse({
        ...validForm,
        phone: "+84909123456",
      }).success,
    ).toBe(true);

    const invalid = branchAdminCreateSchema.safeParse({
      ...validForm,
      phone: "0909abc",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues).toContainEqual(
        expect.objectContaining({
          path: ["phone"],
          message: "Số điện thoại không đúng định dạng.",
        }),
      );
    }
  });
});
