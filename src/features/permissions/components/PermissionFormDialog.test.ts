// @vitest-environment happy-dom

import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "vue-sonner";
import {
  createPermission,
  getPermission,
  updatePermission,
} from "../api/permission-api";
import { roleKeys } from "@/features/roles/api/role-query-keys";
import type { Permission } from "../types";
import PermissionFormDialog from "./PermissionFormDialog.vue";

vi.mock("vue-sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));
vi.mock("../api/permission-api", () => ({
  createPermission: vi.fn(),
  getPermission: vi.fn(),
  updatePermission: vi.fn(),
}));

const permission = {
  id: "01J00000000000000000000000",
  code: "orders.read_own",
  name: "Xem đơn hàng của mình",
  resource: "orders",
  action: "read_own",
  guardName: "web",
  description: "Mô tả cũ",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies Permission;

const WrapperStub = defineComponent({ template: "<div><slot /></div>" });
let queryClient: QueryClient;

function mountDialog(mode: "create" | "update") {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return mount(PermissionFormDialog, {
    attachTo: document.body,
    props: {
      open: true,
      mode,
      permission: mode === "update" ? permission : null,
    },
    global: {
      plugins: [
        [
          VueQueryPlugin,
          {
            queryClient,
          },
        ],
      ],
      stubs: {
        Dialog: WrapperStub,
        DialogContent: WrapperStub,
        DialogDescription: WrapperStub,
        DialogFooter: WrapperStub,
        DialogHeader: WrapperStub,
        DialogTitle: WrapperStub,
        ScrollArea: WrapperStub,
      },
    },
  });
}

async function fillCreateForm(wrapper: ReturnType<typeof mountDialog>) {
  await wrapper.get("#permission-code").setValue("test.create");
  await wrapper.get("#permission-name").setValue("Thực hiện test");
  await wrapper.get("#permission-resource").setValue("test");
  await wrapper.get("#permission-action").setValue("create");
  await wrapper.get("#permission-description").setValue("test");
}

async function clickSubmit(wrapper: ReturnType<typeof mountDialog>) {
  await wrapper.get('button[type="submit"]').trigger("click");
  await flushPromises();
}

describe("PermissionFormDialog submit pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPermission).mockResolvedValue({ data: permission } as never);
    vi.mocked(createPermission).mockResolvedValue({
      data: permission,
    } as never);
    vi.mocked(updatePermission).mockResolvedValue({
      data: permission,
    } as never);
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    document.body.innerHTML = "";
  });

  it("renders an invariant error at code and does not call create", async () => {
    const wrapper = mountDialog("create");
    await fillCreateForm(wrapper);
    await wrapper.get("#permission-code").setValue("test.test");
    await clickSubmit(wrapper);

    expect(wrapper.text()).toContain(
      "Mã quyền phải khớp với tài nguyên và hành động.",
    );
    expect(document.activeElement?.id).toBe("permission-code");
    expect(createPermission).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    await wrapper.get("#permission-action").setValue("test");
    await flushPromises();
    expect(wrapper.text()).not.toContain(
      "Mã quyền phải khớp với tài nguyên và hành động.",
    );
  });

  it("calls create exactly once for a valid full form", async () => {
    const wrapper = mountDialog("create");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    await fillCreateForm(wrapper);
    await clickSubmit(wrapper);

    expect(createPermission).toHaveBeenCalledTimes(1);
    expect(createPermission).toHaveBeenCalledWith({
      code: "test.create",
      name: "Thực hiện test",
      resource: "test",
      action: "create",
      guardName: "web",
      description: "test",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: roleKeys.details() });
  });

  it("submits a description-only patch from an API response", async () => {
    const wrapper = mountDialog("update");
    await flushPromises();
    await wrapper.get("#permission-description").setValue("Mô tả mới");
    await clickSubmit(wrapper);

    expect(updatePermission).toHaveBeenCalledTimes(1);
    expect(updatePermission).toHaveBeenCalledWith(permission.id, {
      description: "Mô tả mới",
    });
  });

  it("clears description with null and skips an unchanged patch", async () => {
    const wrapper = mountDialog("update");
    await flushPromises();
    await wrapper.get("#permission-description").setValue("");
    await clickSubmit(wrapper);
    expect(updatePermission).toHaveBeenCalledWith(permission.id, {
      description: null,
    });

    wrapper.unmount();
    vi.mocked(updatePermission).mockClear();
    vi.mocked(toast.info).mockClear();
    const unchangedWrapper = mountDialog("update");
    await flushPromises();
    await clickSubmit(unchangedWrapper);
    expect(updatePermission).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith("Không có thay đổi để lưu.");
  });

  it("maps backend field errors inline and keeps the dialog open", async () => {
    vi.mocked(createPermission).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { message: "Validation failed", errors: { code: ["invalid"] } },
      },
    });
    const wrapper = mountDialog("create");
    await fillCreateForm(wrapper);
    await clickSubmit(wrapper);

    expect(wrapper.text()).toContain("Mã quyền không hợp lệ.");
    expect(wrapper.emitted("update:open")).toBeUndefined();
    expect(createPermission).toHaveBeenCalledTimes(1);
  });
});
