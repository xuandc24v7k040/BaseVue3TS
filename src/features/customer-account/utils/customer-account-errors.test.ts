import { describe, expect, it } from "vitest";
import { customerAccountErrorMessage } from "./customer-account-errors";

describe("customerAccountErrorMessage", () => {
  it("maps known business codes to Vietnamese", () => {
    expect(
      customerAccountErrorMessage(
        {
          isAxiosError: true,
          response: {
            data: {
              code: "CUSTOMER_ADDRESS_WARD_PROVINCE_MISMATCH",
              message: "Ward mismatch",
            },
          },
        },
        "Không thể lưu địa chỉ.",
      ),
    ).toBe("Phường/Xã không thuộc Tỉnh/Thành phố đã chọn.");
  });

  it("does not expose unknown raw server messages", () => {
    expect(
      customerAccountErrorMessage(
        {
          isAxiosError: true,
          response: {
            data: { code: "UNKNOWN", message: "Invalid input received" },
          },
        },
        "Không thể lưu địa chỉ.",
      ),
    ).toBe("Không thể lưu địa chỉ.");
  });
});
