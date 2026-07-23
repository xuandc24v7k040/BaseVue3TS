// @vitest-environment happy-dom

import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/features/customer-account/api/customer-account-api";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import AccountAddressesPage from "./AccountAddressesPage.vue";

vi.mock("vue-sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/features/customer-account/api/customer-account-api", () => ({
  createCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(),
  setDefaultCustomerAddress: vi.fn(),
  updateCustomerAddress: vi.fn(),
}));
vi.mock("@/features/branches/composables/use-vietnam-administrative-units", async () => {
  const { ref } = await import("vue");
  return {
    useVietnamProvinces: () => ({
      data: ref([{ code: 92, name: "Thành phố Cần Thơ" }]),
      isPending: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    }),
    useVietnamWards: () => ({
      data: ref([{ code: 31117, name: "Phường An Bình" }]),
      isPending: ref(false),
      isError: ref(false),
      refetch: vi.fn(),
    }),
  };
});

const WrapperStub = defineComponent({ template: "<div><slot /></div>" });
const SheetStub = defineComponent({
  props: { open: Boolean },
  emits: ["update:open"],
  template: '<div v-if="open"><slot /></div>',
});
const AdministrativeComboboxStub = defineComponent({
  name: "BranchAdministrativeUnitCombobox",
  props: ["modelValue", "options", "placeholder", "disabled", "invalid"],
  emits: ["update:modelValue", "retry"],
  template: `
    <button
      type="button"
      :data-testid="placeholder.includes('tỉnh') ? 'province-select' : 'ward-select'"
      :disabled="disabled"
      :aria-invalid="String(Boolean(invalid))"
      @click="$emit('update:modelValue', options[0]?.code)"
    >{{ placeholder }}</button>
  `,
});

function mountPage(addresses: Array<Record<string, unknown>> = []) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(customerAccountKeys.addresses(), addresses);
  return mount(AccountAddressesPage, {
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: {
        Sheet: SheetStub,
        SheetContent: WrapperStub,
        SheetDescription: WrapperStub,
        SheetFooter: WrapperStub,
        SheetHeader: WrapperStub,
        SheetTitle: WrapperStub,
        ScrollArea: WrapperStub,
        Dialog: SheetStub,
        DialogContent: WrapperStub,
        DialogDescription: WrapperStub,
        DialogFooter: WrapperStub,
        DialogHeader: WrapperStub,
        DialogTitle: WrapperStub,
        BranchAdministrativeUnitCombobox: AdministrativeComboboxStub,
      },
    },
  });
}

async function openCreate(wrapper: ReturnType<typeof mountPage>) {
  await wrapper
    .findAll("button")
    .find((button) => button.text().includes("Thêm địa chỉ"))
    ?.trigger("click");
}

describe("AccountAddressesPage hotfix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createCustomerAddress).mockResolvedValue({} as never);
    vi.mocked(updateCustomerAddress).mockResolvedValue({} as never);
    vi.mocked(deleteCustomerAddress).mockResolvedValue({} as never);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("uses custom Vietnamese validation and never calls the API for an empty form", async () => {
    const wrapper = mountPage();
    await openCreate(wrapper);
    const form = wrapper.get("#customer-address-form");
    expect(form.attributes("novalidate")).toBeDefined();
    expect(wrapper.find("[required]").exists()).toBe(false);

    await form.trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Vui lòng nhập họ và tên người nhận.");
    expect(wrapper.text()).toContain("Vui lòng nhập số điện thoại.");
    expect(wrapper.text()).toContain("Vui lòng chọn tỉnh hoặc thành phố.");
    expect(wrapper.text()).toContain("Vui lòng chọn phường hoặc xã.");
    expect(wrapper.text()).toContain("Vui lòng nhập địa chỉ chi tiết.");
    expect(wrapper.text()).not.toContain("Invalid input");
    expect(wrapper.text()).not.toContain("Please fill out this field");
    expect(createCustomerAddress).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("clears field errors when values become valid and sends normalized codes", async () => {
    const wrapper = mountPage();
    await openCreate(wrapper);
    await wrapper.get("#customer-address-form").trigger("submit");
    await flushPromises();

    await wrapper.get("#customer-address-recipient-name").setValue("Nguyễn An");
    await wrapper.get("#customer-address-phone").setValue("0901234567");
    await wrapper.get('[data-testid="province-select"]').trigger("click");
    expect(wrapper.get('[data-testid="ward-select"]').attributes("disabled")).toBeUndefined();
    await wrapper.get('[data-testid="ward-select"]').trigger("click");
    await wrapper.get("#customer-address-detail").setValue("12 đường Nguyễn Trãi");

    expect(wrapper.text()).not.toContain("Vui lòng nhập họ và tên người nhận.");
    expect(wrapper.text()).not.toContain("Vui lòng nhập số điện thoại.");
    expect(wrapper.text()).not.toContain("Vui lòng chọn tỉnh hoặc thành phố.");
    expect(wrapper.text()).not.toContain("Vui lòng chọn phường hoặc xã.");
    expect(wrapper.text()).not.toContain("Vui lòng nhập địa chỉ chi tiết.");

    await wrapper.get("#customer-address-form").trigger("submit");
    await flushPromises();
    expect(createCustomerAddress).toHaveBeenCalledWith(
      expect.objectContaining({ provinceCode: 92, wardCode: 31117 }),
    );
  });

  it("clears the old Ward when Province changes", async () => {
    const wrapper = mountPage();
    await openCreate(wrapper);
    await wrapper.get('[data-testid="province-select"]').trigger("click");
    await wrapper.get('[data-testid="ward-select"]').trigger("click");
    await wrapper.get('[data-testid="province-select"]').trigger("click");

    expect(
      wrapper.getComponent(AdministrativeComboboxStub).props("modelValue"),
    ).toBe(92);
    expect(
      wrapper.findAllComponents(AdministrativeComboboxStub)[1]?.props("modelValue"),
    ).toBeNull();
  });

  it("resets create state after close/reopen and keeps the Sheet open on API failure", async () => {
    vi.mocked(createCustomerAddress).mockRejectedValueOnce(new Error("network"));
    const wrapper = mountPage();
    await openCreate(wrapper);
    await wrapper.get("#customer-address-recipient-name").setValue("Dữ liệu cũ");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Hủy bỏ"))
      ?.trigger("click");
    await openCreate(wrapper);
    expect(
      (wrapper.get("#customer-address-recipient-name").element as HTMLInputElement)
        .value,
    ).toBe("");

    await wrapper.get("#customer-address-recipient-name").setValue("Nguyễn An");
    await wrapper.get("#customer-address-phone").setValue("0901234567");
    await wrapper.get('[data-testid="province-select"]').trigger("click");
    await wrapper.get('[data-testid="ward-select"]').trigger("click");
    await wrapper.get("#customer-address-detail").setValue("12 đường Nguyễn Trãi");
    await wrapper.get("#customer-address-form").trigger("submit");
    await flushPromises();

    expect(wrapper.find("#customer-address-form").exists()).toBe(true);
    expect(toast.error).toHaveBeenCalledWith("Không thể lưu địa chỉ.");
  });

  it("closes the delete dialog on cancel and calls delete on confirmation", async () => {
    const address = {
      id: "address-1",
      label: "Nhà",
      recipientName: "Nguyễn An",
      phone: "0901234567",
      provinceCode: 92,
      provinceName: "Thành phố Cần Thơ",
      wardCode: 31117,
      wardName: "Phường An Bình",
      addressDetail: "12 đường Nguyễn Trãi",
      formattedAddress: "12 đường Nguyễn Trãi, Phường An Bình, Thành phố Cần Thơ",
      isDefault: false,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    };
    const wrapper = mountPage([address]);

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Xóa")
      ?.trigger("click");
    expect(wrapper.text()).toContain("Xóa địa chỉ?");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Hủy bỏ")
      ?.trigger("click");
    expect(wrapper.text()).not.toContain("Xóa địa chỉ?");

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Xóa")
      ?.trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Xóa địa chỉ")
      ?.trigger("click");
    await flushPromises();
    expect(deleteCustomerAddress).toHaveBeenCalledWith("address-1");
  });
});
