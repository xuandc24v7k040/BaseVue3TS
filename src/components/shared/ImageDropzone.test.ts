// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ImageDropzone from "./ImageDropzone.vue";

class DecodableImage {
  naturalWidth = 100;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe("ImageDropzone", () => {
  const createObjectURL = vi.fn(() => "blob:preview");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("Image", DecodableImage);
    vi.stubGlobal("createImageBitmap", async () => ({
      width: 100,
      height: 100,
      close: vi.fn(),
    }));
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function select(wrapper: ReturnType<typeof mount>, file: File) {
    const input = wrapper.get("input[type='file']");
    Object.defineProperty(input.element, "files", {
      configurable: true,
      value: [file],
    });
    await input.trigger("change");
    await flushPromises();
  }

  it("rejects an invalid MIME before emitting a file or creating a preview", async () => {
    const wrapper = mount(ImageDropzone, {
      props: { modelValue: null },
    });

    await select(
      wrapper,
      new File(["not-an-image"], "document.txt", { type: "text/plain" }),
    );

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("invalid")?.[0]).toEqual([
      "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.",
    ]);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("document.txt");
  });

  it("keeps the existing preview when a replacement is invalid", async () => {
    const wrapper = mount(ImageDropzone, {
      props: {
        modelValue: null,
        currentUrl: "https://cdn.example.test/existing.webp",
      },
    });

    await select(
      wrapper,
      new File(["bad"], "replacement.gif", { type: "image/gif" }),
    );

    expect(wrapper.get("img").attributes("src")).toBe(
      "https://cdn.example.test/existing.webp",
    );
    expect(wrapper.emitted("remove")).toBeUndefined();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("creates a preview only after a valid image can be decoded", async () => {
    const wrapper = mount(ImageDropzone, {
      props: { modelValue: null },
    });
    const file = new File(["image"], "cover.png", { type: "image/png" });

    await select(wrapper, file);

    expect(wrapper.emitted("valid")).toHaveLength(1);
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([file]);
    expect(createObjectURL).not.toHaveBeenCalled();

    await wrapper.setProps({ modelValue: file });
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(wrapper.get("img").attributes("src")).toBe("blob:preview");
    expect(wrapper.text()).toContain("cover.png");
  });

  it("revokes the local object URL when cleared", async () => {
    const file = new File(["image"], "cover.webp", { type: "image/webp" });
    const wrapper = mount(ImageDropzone, {
      props: { modelValue: file },
    });
    await flushPromises();

    await wrapper.setProps({ modelValue: null });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });
});
