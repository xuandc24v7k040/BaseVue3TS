// @vitest-environment happy-dom

import { defineComponent, nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import {
  removeCustomerAvatar,
  uploadCustomerAvatar,
} from "@/features/customer-account/api/customer-account-api";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import CustomerAvatarDialog from "./CustomerAvatarDialog.vue";

let activeQueryClient: QueryClient;

vi.mock("vue-sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/features/customer-account/api/customer-account-api", () => ({
  removeCustomerAvatar: vi.fn(),
  uploadCustomerAvatar: vi.fn(),
}));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: () => ({ refreshCurrentUser: vi.fn().mockResolvedValue(undefined) }),
}));

const WrapperStub = defineComponent({ template: "<div><slot /></div>" });
const ImageDropzoneStub = defineComponent({
  name: "ImageDropzone",
  props: ["modelValue", "currentUrl", "disabled"],
  emits: ["update:modelValue", "remove", "invalid", "valid"],
  setup(_props, { emit }) {
    return {
      choose: () =>
        emit("update:modelValue", {
          name: "avatar.png",
          type: "image/png",
          size: 1024,
        } as File),
    };
  },
  template: `
    <div>
      <button data-testid="choose" type="button" @click="choose">Chọn</button>
      <button data-testid="remove" type="button" @click="$emit('remove')">Xóa</button>
      <button data-testid="invalid" type="button" @click="$emit('invalid', 'Ảnh không hợp lệ.')">Sai</button>
    </div>
  `,
});

function mountDialog(open = true, avatarUrl: string | null = null) {
  const pinia = createPinia();
  activeQueryClient = new QueryClient();
  setActivePinia(pinia);
  return mount(CustomerAvatarDialog, {
    props: { open, avatarUrl, fullName: "Nguyễn An" },
    global: {
      plugins: [pinia, [VueQueryPlugin, { queryClient: activeQueryClient }]],
      stubs: {
        Dialog: WrapperStub,
        DialogContent: WrapperStub,
        DialogDescription: WrapperStub,
        DialogFooter: WrapperStub,
        DialogHeader: WrapperStub,
        DialogTitle: WrapperStub,
        ScrollArea: WrapperStub,
        ImageDropzone: ImageDropzoneStub,
      },
    },
  });
}

describe("CustomerAvatarDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uploadCustomerAvatar).mockResolvedValue({} as never);
    vi.mocked(removeCustomerAvatar).mockResolvedValue({
      id: "customer-1",
      fullName: "Nguyễn An",
      email: "reader@bookora.vn",
      avatarUrl: null,
    } as never);
  });

  it("uploads once, blocks double-submit and reports success", async () => {
    let resolveUpload: (() => void) | undefined;
    vi.mocked(uploadCustomerAvatar).mockImplementationOnce(
      () => new Promise((resolve) => (resolveUpload = () => resolve({} as never))),
    );
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="choose"]').trigger("click");
    const upload = wrapper.findAll("button").find((button) =>
      button.text().includes("Tải ảnh lên"),
    );
    await upload?.trigger("click");
    await nextTick();
    await upload?.trigger("click");

    expect(uploadCustomerAvatar).toHaveBeenCalledOnce();
    expect(upload?.attributes("disabled")).toBeDefined();
    resolveUpload?.();
    await flushPromises();
    expect(toast.success).toHaveBeenCalledWith("Đã thêm ảnh đại diện.");
  });

  it("only deletes an existing avatar after save is confirmed", async () => {
    const wrapper = mountDialog(true, "https://cdn.example/avatar.webp");
    activeQueryClient.setQueryData(customerAccountKeys.profile(), {
      avatarUrl: "https://cdn.example/avatar.webp",
    });
    await wrapper.get('[data-testid="remove"]').trigger("click");
    await nextTick();

    expect(removeCustomerAvatar).not.toHaveBeenCalled();
    expect(
      activeQueryClient.getQueryData<{ avatarUrl: string | null }>(
        customerAccountKeys.profile(),
      )?.avatarUrl,
    ).toBe("https://cdn.example/avatar.webp");
    expect(wrapper.emitted("update:open")).toBeUndefined();

    const save = wrapper.findAll("button").find((button) =>
      button.text().includes("Lưu thay đổi"),
    );
    expect(save?.attributes("disabled")).toBeUndefined();
    await save?.trigger("click");
    await flushPromises();

    expect(removeCustomerAvatar).toHaveBeenCalledOnce();
    expect(
      activeQueryClient.getQueryData<{ avatarUrl: string | null }>(
        customerAccountKeys.profile(),
      )?.avatarUrl,
    ).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Đã gỡ ảnh đại diện.");
  });

  it("discards a pending avatar removal when the dialog is cancelled", async () => {
    const wrapper = mountDialog(true, "https://cdn.example/avatar.webp");

    await wrapper.get('[data-testid="remove"]').trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Hủy bỏ"))
      ?.trigger("click");
    await flushPromises();

    expect(removeCustomerAvatar).not.toHaveBeenCalled();
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("shows validation failure and resets file and error after close/reopen", async () => {
    const wrapper = mountDialog();
    await wrapper.get('[data-testid="choose"]').trigger("click");
    await wrapper.get('[data-testid="invalid"]').trigger("click");
    expect(wrapper.text()).toContain("Ảnh không hợp lệ.");
    expect(toast.error).toHaveBeenCalledWith("Ảnh không hợp lệ.");

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    expect(wrapper.text()).not.toContain("Ảnh không hợp lệ.");
    const upload = wrapper.findAll("button").find((button) =>
      button.text().includes("Tải ảnh lên"),
    );
    expect(upload?.attributes("disabled")).toBeDefined();
  });

  it("keeps the dialog open and reports API failures", async () => {
    vi.mocked(uploadCustomerAvatar).mockRejectedValueOnce(new Error("network"));
    const wrapper = mountDialog();
    await wrapper.get('[data-testid="choose"]').trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Tải ảnh lên"))
      ?.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("update:open")).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith("Không thể cập nhật ảnh đại diện.");
  });
});
