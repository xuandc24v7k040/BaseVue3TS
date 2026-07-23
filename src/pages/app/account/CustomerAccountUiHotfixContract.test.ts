import { describe, expect, it } from "vitest";
import profileSource from "./AccountProfilePage.vue?raw";
import addressSource from "./AccountAddressesPage.vue?raw";
import sidebarSource from "@/components/client/layout/CustomerAccountSidebar.vue?raw";
import avatarDialogSource from "@/features/customer-account/components/CustomerAvatarDialog.vue?raw";
import administrativeComboboxSource from "@/features/branches/components/BranchAdministrativeUnitCombobox.vue?raw";

describe("Customer Account UI hotfix contract", () => {
  it("keeps avatar management outside the profile update dialog", () => {
    expect(profileSource).not.toContain("ImageDropzone");
    expect(profileSource).not.toContain("uploadCustomerAvatar");
    expect(profileSource).not.toContain("removeCustomerAvatar");
    expect(profileSource).not.toContain("<Avatar");
    expect(profileSource).not.toContain("selectedAvatar");
    expect(profileSource).toContain("updateCustomerProfile(payload)");
    expect(profileSource).toContain("Email");
    expect(profileSource).toContain("disabled");
    expect(profileSource).toContain("readonly");
  });

  it("uses a dedicated sidebar avatar dialog and shared preview", () => {
    expect(sidebarSource).toContain("CustomerAvatarDialog");
    expect(sidebarSource).toContain("ImagePreviewDialog");
    expect(sidebarSource).toContain('v-if="avatarUrl"');
    expect(sidebarSource).toContain("customer-avatar-preview");
    expect(avatarDialogSource).toContain("ImageDropzone");
    expect(avatarDialogSource).toContain("uploadCustomerAvatar");
    expect(avatarDialogSource).toContain("removeCustomerAvatar");
    expect(avatarDialogSource).toContain("ScrollArea");
  });

  it("uses Branch searchable administrative selects without District", () => {
    expect(addressSource).toContain("BranchAdministrativeUnitCombobox");
    expect(addressSource).toContain('search-placeholder="Tìm tỉnh/thành phố..."');
    expect(addressSource).toContain('search-placeholder="Tìm phường/xã..."');
    expect(addressSource).toContain("novalidate");
    expect(addressSource).not.toMatch(/\brequired\b/);
    expect(addressSource).not.toMatch(/district/i);
    expect(administrativeComboboxSource).toContain('class="z-[70]');
    expect(administrativeComboboxSource).toContain(':collision-padding="16"');
    expect(administrativeComboboxSource).toContain("normalizeAdministrativeName");
    expect(administrativeComboboxSource).toContain("ArrowDown");
    expect(administrativeComboboxSource).toContain("ArrowUp");
    expect(administrativeComboboxSource).toContain("Không tìm thấy kết quả.");
    expect(administrativeComboboxSource).toContain("Không thể tải danh mục hành chính.");
  });
});
