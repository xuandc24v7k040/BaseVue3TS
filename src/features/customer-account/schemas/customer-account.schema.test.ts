import { describe, expect, it } from "vitest";
import {
  customerAddressSchema,
  customerPasswordSchema,
  customerProfileSchema,
} from "./customer-account.schema";

describe("customer account schemas", () => {
  it("validates an editable profile without an email field", () => {
    expect(customerProfileSchema.keyof().options).not.toContain("email");
    expect(
      customerProfileSchema.safeParse({
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
        gender: "unspecified",
        birthday: "",
        defaultAddressId: "",
      }).success,
    ).toBe(true);
  });

  it("requires the selected ward to be represented by a positive code", () => {
    expect(
      customerAddressSchema.safeParse({
        label: "",
        recipientName: "Nguyễn Văn A",
        phone: "0901234567",
        provinceCode: 92,
        wardCode: 0,
        addressDetail: "Số 1 đường A",
        isDefault: false,
      }).success,
    ).toBe(false);
  });

  it("returns Vietnamese required messages for an empty address", () => {
    const result = customerAddressSchema.safeParse({
      label: "",
      recipientName: "",
      phone: "",
      provinceCode: null,
      wardCode: null,
      addressDetail: "",
      isDefault: false,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Vui lòng nhập họ và tên người nhận.",
        "Vui lòng nhập số điện thoại.",
        "Vui lòng chọn tỉnh hoặc thành phố.",
        "Vui lòng chọn phường hoặc xã.",
        "Vui lòng nhập địa chỉ chi tiết.",
      ]),
    );
    expect(messages.join(" ")).not.toContain("Invalid input");
  });

  it("requires password confirmation to match", () => {
    expect(
      customerPasswordSchema.safeParse({
        currentPassword: "Current1",
        newPassword: "Password2",
        confirmPassword: "Password3",
      }).success,
    ).toBe(false);
  });
});
