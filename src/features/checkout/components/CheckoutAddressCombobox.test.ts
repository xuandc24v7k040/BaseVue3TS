// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import CheckoutAddressCombobox from "./CheckoutAddressCombobox.vue";

const addresses = [
  {
    id: "01K7Y7MWNCW7BNBBNTWAB9DYSH",
    label: "Nhà",
    recipientName: "Nguyễn Văn A",
    phone: "0901234567",
    provinceCode: 92,
    provinceName: "Cần Thơ",
    wardCode: 31117,
    wardName: "Ninh Kiều",
    addressDetail: "Hẻm tổ 7",
    formattedAddress: "Hẻm tổ 7, Phường Ninh Kiều, Thành phố Cần Thơ",
    isDefault: true,
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
  },
  {
    id: "01K7Y7MWNCW7BNBBNTWAB9DYSJ",
    label: "Công ty",
    recipientName: "Nguyễn Văn A",
    phone: "0901234567",
    provinceCode: 92,
    provinceName: "Cần Thơ",
    wardCode: 31120,
    wardName: "Cái Răng",
    addressDetail: "Đường 30/4",
    formattedAddress: "Đường 30/4, Phường Cái Răng, Thành phố Cần Thơ",
    isDefault: false,
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T00:00:00.000Z",
  },
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CheckoutAddressCombobox", () => {
  it("renders shadcn combobox semantics without a native select", async () => {
    const wrapper = mount(CheckoutAddressCombobox, {
      attachTo: document.body,
      props: {
        addresses,
        selectedId: addresses[0]!.id,
      },
    });

    expect(wrapper.find("select").exists()).toBe(false);
    const trigger = wrapper.get('[role="combobox"]');
    expect(trigger.attributes("aria-expanded")).toBe("false");

    await trigger.trigger("click");
    await flushPromises();

    expect(document.body.querySelector('[role="listbox"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Mặc định");
    expect(document.body.textContent).toContain("Nguyễn Văn A");
  });

  it("selects an option once and supports ArrowDown + Enter", async () => {
    const wrapper = mount(CheckoutAddressCombobox, {
      attachTo: document.body,
      props: {
        addresses,
        selectedId: "",
      },
    });

    await wrapper.get('[role="combobox"]').trigger("click");
    await flushPromises();
    const search = document.body.querySelector<HTMLInputElement>(
      '[aria-label="Tìm địa chỉ đã lưu"]',
    );
    expect(search).not.toBeNull();

    search?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    search?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await flushPromises();

    expect(wrapper.emitted("select")).toEqual([[addresses[1]!.id]]);
  });
});
