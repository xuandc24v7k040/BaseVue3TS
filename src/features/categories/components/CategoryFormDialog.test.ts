// @vitest-environment happy-dom

import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, CategoryTreeNode } from "../types";
import CategoryFormDialog from "./CategoryFormDialog.vue";

const api = vi.hoisted(() => ({
  createCategory: vi.fn(),
  listCategoryTree: vi.fn(),
  removeCategoryImage: vi.fn(),
  updateCategory: vi.fn(),
  uploadCategoryImage: vi.fn(),
}));
const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("../api/category-api", () => api);
vi.mock("vue-sonner", () => ({ toast }));

const root: CategoryTreeNode = {
  id: "01J00000000000000000000001",
  name: "Kinh tế",
  slug: "kinh-te",
  description: null,
  parentId: null,
  type: "NORMAL",
  imageUrl: null,
  isActive: true,
  effectiveActive: true,
  sortOrder: 10,
  level: 1,
  childrenCount: 0,
  productCount: 0,
  parent: null,
  children: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function savedCategory(overrides: Partial<Category> = {}): Category {
  return {
    ...root,
    id: "01J00000000000000000000002",
    name: "Kinh tế học",
    slug: "kinh-te-hoc",
    parentId: null,
    children: [],
    ...overrides,
  };
}

const passthrough = { template: "<div><slot /></div>" };
const ImageDropzoneStub = defineComponent({
  props: { modelValue: { type: Object, default: null } },
  emits: ["update:modelValue", "valid", "invalid", "remove"],
  setup(_props, { emit }) {
    return {
      choose: () => {
        emit(
          "update:modelValue",
          new File(["image"], "cover.png", { type: "image/png" }),
        );
        emit("valid");
      },
    };
  },
  template:
    '<button data-testid="choose-image" type="button" @click="choose">Chọn ảnh</button>',
});

function mountDialog(
  options: {
    attachTo?: HTMLElement;
    props?: Partial<InstanceType<typeof CategoryFormDialog>["$props"]>;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return mount(CategoryFormDialog, {
    attachTo: options.attachTo,
    props: { open: true, mode: "create", ...options.props },
    global: {
      plugins: [[VueQueryPlugin, { queryClient }]],
      stubs: {
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        ScrollArea: passthrough,
        Select: passthrough,
        SelectContent: passthrough,
        SelectItem: passthrough,
        SelectTrigger: passthrough,
        SelectValue: passthrough,
        TreeSelect: {
          name: "TreeSelectStub",
          props: ["options", "modelValue"],
          emits: ["update:modelValue"],
          template:
            '<button data-testid="parent-options" type="button">{{ options.map((item) => item.name).join(",") }}</button>',
        },
        ImageDropzone: ImageDropzoneStub,
      },
    },
  });
}

describe("CategoryFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listCategoryTree.mockResolvedValue({ data: [root] });
    api.createCategory.mockResolvedValue({ data: savedCategory() });
    api.uploadCategoryImage.mockResolvedValue({ data: savedCategory() });
  });

  it("loads roots, previews a read-only slug and omits slug from create payload", async () => {
    const backendCategory = savedCategory({
      slug: "kinh-te-kinh-te-hoc",
      parentId: root.id,
      parent: {
        id: root.id,
        name: root.name,
        parentId: null,
        type: root.type,
        isActive: true,
      },
    });
    api.createCategory.mockResolvedValueOnce({ data: backendCategory });
    const wrapper = mountDialog();
    await flushPromises();

    expect(api.listCategoryTree).toHaveBeenCalledWith(
      {
        level: 1,
        type: "NORMAL",
        sortBy: "sortOrder",
        sortOrder: "asc",
      },
      expect.any(AbortSignal),
    );
    expect(wrapper.get("[data-testid='parent-options']").text()).toContain(
      "Kinh tế",
    );

    await wrapper.get("#category-name").setValue("Kinh tế học");
    const slug = wrapper.get<HTMLInputElement>("#category-slug");
    expect(slug.element.value).toBe("kinh-te-hoc");
    expect(slug.attributes()).toHaveProperty("disabled");
    expect(slug.attributes()).toHaveProperty("readonly");

    wrapper
      .findComponent({ name: "TreeSelectStub" })
      .vm.$emit("update:modelValue", root.id);
    await flushPromises();
    expect(slug.element.value).toBe("kinh-te-kinh-te-hoc");

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(api.createCategory).toHaveBeenCalledWith({
      name: "Kinh tế học",
      description: null,
      parentId: root.id,
      type: "NORMAL",
      isActive: true,
      sortOrder: 0,
    });
    expect(api.createCategory.mock.calls[0]?.[0]).not.toHaveProperty("slug");
    expect(wrapper.emitted("saved")).toEqual([[backendCategory]]);
    expect(toast.success).toHaveBeenCalledWith("Tạo danh mục thành công.");
  });

  it("updates the edit preview when name or parent changes", async () => {
    const otherRoot: CategoryTreeNode = {
      ...root,
      id: "01J00000000000000000000003",
      name: "Văn học",
      slug: "van-hoc",
    };
    const edited = savedCategory({
      parentId: root.id,
      slug: "kinh-te-kinh-te-hoc",
      parent: {
        id: root.id,
        name: root.name,
        parentId: null,
        type: root.type,
        isActive: true,
      },
    });
    api.listCategoryTree.mockResolvedValueOnce({ data: [root, otherRoot] });
    const wrapper = mountDialog({
      props: { mode: "update", category: edited },
    });
    await flushPromises();

    expect(wrapper.get<HTMLInputElement>("#category-slug").element.value).toBe(
      "kinh-te-kinh-te-hoc",
    );
    await wrapper.get("#category-name").setValue("Tiểu thuyết");
    expect(wrapper.get<HTMLInputElement>("#category-slug").element.value).toBe(
      "kinh-te-tieu-thuyet",
    );

    wrapper
      .findComponent({ name: "TreeSelectStub" })
      .vm.$emit("update:modelValue", otherRoot.id);
    await flushPromises();
    expect(wrapper.get<HTMLInputElement>("#category-slug").element.value).toBe(
      "van-hoc-tieu-thuyet",
    );
  });

  it("reports partial success without creating a duplicate category", async () => {
    api.uploadCategoryImage.mockRejectedValueOnce(new Error("upload failed"));
    const wrapper = mountDialog();
    await flushPromises();
    await wrapper.get("#category-name").setValue("Kinh tế học");
    await wrapper.get("[data-testid='choose-image']").trigger("click");

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(api.createCategory).toHaveBeenCalledTimes(1);
    expect(api.uploadCategoryImage).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledWith(
      "Đã tạo danh mục nhưng chưa thể tải ảnh lên.",
      { description: "Mở lại chỉnh sửa để thử tải ảnh lần nữa." },
    );
    expect(wrapper.emitted("update:open")).toContainEqual([false]);
  });

  it("maps duplicate names inline, focuses name, clears on change and skips toast", async () => {
    api.createCategory.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: { code: "CATEGORY_NAME_ALREADY_EXISTS" },
      },
    });
    const wrapper = mountDialog({ attachTo: document.body });
    await flushPromises();
    const nameInput = wrapper.get<HTMLInputElement>("#category-name");
    await nameInput.setValue("Văn học Việt Nam");

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Tên danh mục đã tồn tại trong cùng phạm vi. Vui lòng chọn tên khác.",
    );
    expect(document.activeElement).toBe(nameInput.element);
    expect(toast.error).not.toHaveBeenCalled();

    await nameInput.setValue("Văn học Việt Nam mới");
    expect(wrapper.text()).not.toContain(
      "Tên danh mục đã tồn tại trong cùng phạm vi. Vui lòng chọn tên khác.",
    );
    wrapper.unmount();
  });
});
