<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Info, Plus } from "@lucide/vue";
import { toast } from "vue-sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fullAddress,
  initialAddresses,
  type AccountAddressMock,
} from "./account.mock";

const addresses = ref<AccountAddressMock[]>(
  initialAddresses.map((item) => ({ ...item })),
);
const sheetOpen = ref(false);
const deleteOpen = ref(false);
const editingId = ref<number | null>(null);
const deleting = ref<AccountAddressMock | null>(null);
const emptyForm = (): AccountAddressMock => ({
  id: 0,
  label: "",
  fullName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  detail: "",
  isDefault: false,
});
const form = reactive<AccountAddressMock>(emptyForm());
const locations: Record<string, Record<string, string[]>> = {
  "Cần Thơ": { "Quận Ninh Kiều": ["Phường An Hòa", "Phường Cái Khế"] },
  "Hậu Giang": {
    "Thị xã Long Mỹ": ["Phường Bình Thạnh"],
    "Huyện Châu Thành A": ["Xã Tân Phú Thạnh"],
  },
  "Hồ Chí Minh": { "Quận 1": ["Phường Bến Nghé"] },
  "Hà Nội": { "Quận Hoàn Kiếm": ["Phường Hàng Bạc"] },
  "Sóc Trăng": { "Thành phố Sóc Trăng": ["Phường 5"] },
};
const districts = computed(() => Object.keys(locations[form.province] ?? {}));
const wards = computed(() => locations[form.province]?.[form.district] ?? []);
function openAdd() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  sheetOpen.value = true;
}
function openEdit(address: AccountAddressMock) {
  editingId.value = address.id;
  Object.assign(form, address);
  sheetOpen.value = true;
}
function changeProvince(value: string) {
  form.province = value;
  form.district = "";
  form.ward = "";
}
function changeDistrict(value: string) {
  form.district = value;
  form.ward = "";
}
function save() {
  if (
    !form.fullName.trim() ||
    !/^0\d{9}$/.test(form.phone) ||
    !form.province ||
    !form.district ||
    !form.ward ||
    !form.detail.trim()
  )
    return toast.error("Vui lòng nhập đầy đủ thông tin địa chỉ hợp lệ.");
  if (form.isDefault)
    addresses.value.forEach((item) => {
      item.isDefault = false;
    });
  if (editingId.value) {
    const target = addresses.value.find((item) => item.id === editingId.value);
    if (target) Object.assign(target, form);
  } else
    addresses.value.push({
      ...form,
      id: Math.max(0, ...addresses.value.map((item) => item.id)) + 1,
    });
  sheetOpen.value = false;
  toast.success(editingId.value ? "Đã lưu thay đổi." : "Đã thêm địa chỉ.");
}
function askDelete(address: AccountAddressMock) {
  deleting.value = address;
  deleteOpen.value = true;
}
function confirmDelete() {
  if (!deleting.value) return;
  if (deleting.value.isDefault) {
    toast.error("Không thể xóa địa chỉ mặc định.");
    deleteOpen.value = false;
    return;
  }
  addresses.value = addresses.value.filter(
    (item) => item.id !== deleting.value?.id,
  );
  deleteOpen.value = false;
  toast.success("Đã xóa địa chỉ.");
}
</script>

<template>
  <Card class="min-w-0 p-5 shadow-none sm:p-6"
    ><div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold">Địa chỉ của tôi</h1>
        <p class="mt-1 text-sm text-[var(--bookora-muted)]">
          Quản lý và chọn địa chỉ giao hàng của bạn
        </p>
      </div>
      <Button
        class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
        @click="openAdd"
        ><Plus class="size-4" />Thêm địa chỉ</Button
      >
    </div>
    <div class="mt-6 grid min-w-0 auto-rows-fr gap-4 lg:grid-cols-2">
      <article
        v-for="address in addresses"
        :key="address.id"
        class="flex h-full min-w-0 flex-col rounded-xl border border-[var(--bookora-border)] p-5"
      >
        <div class="flex items-start justify-between gap-2">
          <h2 class="text-lg font-bold">{{ address.label || "Địa chỉ" }}</h2>
          <Badge
            v-if="address.isDefault"
            class="bg-[var(--bookora-soft)] text-[var(--bookora-green)]"
            >Mặc định</Badge
          >
        </div>
        <div class="flex-1">
          <p class="mt-5 text-sm font-medium">
            {{ address.fullName }} <span class="mx-2 text-border">|</span>
            {{ address.phone }}
          </p>
          <p
            class="mt-4 break-words text-sm leading-7 text-[var(--bookora-muted)]"
          >
            {{ fullAddress(address) }}
          </p>
        </div>
        <div class="mt-5 flex justify-end divide-x text-sm">
          <button
            type="button"
            class="px-3 hover:text-destructive"
            @click="askDelete(address)"
          >
            Xóa</button
          ><button
            type="button"
            class="px-3 hover:text-[var(--bookora-green)]"
            @click="openEdit(address)"
          >
            Cập nhật
          </button>
        </div>
      </article>
    </div>
    <div
      class="mt-3 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700"
    >
      <Info class="size-5 shrink-0" />Bạn có thể thêm tối đa 10 địa chỉ giao
      hàng.
    </div>
  </Card>

  <Sheet v-model:open="sheetOpen"
    ><SheetContent class="bookora-client w-full min-w-0 max-w-full sm:max-w-xl"
      ><SheetHeader
        ><SheetTitle>{{
          editingId ? "Cập nhật địa chỉ" : "Thêm địa chỉ"
        }}</SheetTitle
        ><SheetDescription
          >Thông tin này chỉ được lưu trong phiên mock hiện
          tại.</SheetDescription
        ></SheetHeader
      >
      <form
        class="flex min-h-0 min-w-0 max-w-full flex-1 flex-col"
        @submit.prevent="save"
      >
        <div
          class="grid min-w-0 max-w-full flex-1 gap-4 overflow-y-auto px-4 py-2 sm:grid-cols-2"
        >
          <label class="grid min-w-0 content-start gap-1 text-sm sm:col-span-2"
            >Đặt tên địa chỉ (tùy chọn)<Input v-model="form.label" /></label
          ><label class="grid min-w-0 content-start gap-1 text-sm"
            >Họ và tên<Input v-model="form.fullName" required /></label
          ><label class="grid min-w-0 content-start gap-1 text-sm"
            >Số điện thoại<Input v-model="form.phone" required
          /></label>
          <label class="grid min-w-0 content-start gap-1 text-sm"
            >Tỉnh/Thành phố<Select
              :model-value="form.province"
              @update:model-value="changeProvince(String($event))"
              ><SelectTrigger class="w-full min-w-0"
                ><SelectValue
                  class="min-w-0 truncate"
                  placeholder="Chọn tỉnh/thành" /></SelectTrigger
              ><SelectContent
                ><SelectItem
                  v-for="province in Object.keys(locations)"
                  :key="province"
                  :value="province"
                  >{{ province }}</SelectItem
                ></SelectContent
              ></Select
            ></label
          ><label class="grid min-w-0 content-start gap-1 text-sm"
            >Quận/Huyện<Select
              :model-value="form.district"
              :disabled="!form.province"
              @update:model-value="changeDistrict(String($event))"
              ><SelectTrigger class="w-full min-w-0"
                ><SelectValue
                  class="min-w-0 truncate"
                  placeholder="Chọn quận/huyện" /></SelectTrigger
              ><SelectContent
                ><SelectItem
                  v-for="district in districts"
                  :key="district"
                  :value="district"
                  >{{ district }}</SelectItem
                ></SelectContent
              ></Select
            ></label
          ><label class="grid min-w-0 content-start gap-1 text-sm sm:col-span-2"
            >Phường/Xã<Select v-model="form.ward" :disabled="!form.district"
              ><SelectTrigger class="w-full min-w-0"
                ><SelectValue
                  class="min-w-0 truncate"
                  placeholder="Chọn phường/xã" /></SelectTrigger
              ><SelectContent
                ><SelectItem v-for="ward in wards" :key="ward" :value="ward">{{
                  ward
                }}</SelectItem></SelectContent
              ></Select
            ></label
          >
          <label class="grid min-w-0 content-start gap-1 text-sm sm:col-span-2"
            >Địa chỉ chi tiết<textarea
              v-model="form.detail"
              required
              class="min-h-24 min-w-0 max-w-full rounded-md border bg-transparent p-3 outline-none focus:ring-2 focus:ring-[var(--bookora-green)]"
            /></label
          ><label
            class="flex min-w-0 items-center justify-between gap-4 text-sm sm:col-span-2"
            >Đặt làm địa chỉ mặc định<button
              type="button"
              role="switch"
              :aria-checked="form.isDefault"
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="form.isDefault ? 'bg-[var(--bookora-green)]' : 'bg-muted'"
              @click="form.isDefault = !form.isDefault"
            >
              <span
                class="absolute top-1 size-4 rounded-full bg-white transition-all"
                :class="form.isDefault ? 'left-6' : 'left-1'"
              /></button
          ></label>
        </div>
        <SheetFooter class="grid min-w-0 grid-cols-2 gap-2.5 border-t"
          ><Button
            type="button"
            variant="outline"
            class="h-10 w-full min-w-0"
            @click="sheetOpen = false"
            >Hủy bỏ</Button
          ><Button
            type="submit"
            class="h-10 w-full min-w-0 bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
            >{{ editingId ? "Lưu thay đổi" : "Thêm địa chỉ" }}</Button
          ></SheetFooter
        >
      </form></SheetContent
    ></Sheet
  >

  <Dialog v-model:open="deleteOpen"
    ><DialogContent
      ><DialogHeader
        ><DialogTitle>Xóa địa chỉ?</DialogTitle
        ><DialogDescription>{{
          deleting?.isDefault
            ? "Địa chỉ mặc định không thể xóa. Hãy chọn địa chỉ mặc định khác trước."
            : `Bạn có chắc muốn xóa địa chỉ ${deleting?.label ?? ""}?`
        }}</DialogDescription></DialogHeader
      ><DialogFooter
        ><Button variant="outline" @click="deleteOpen = false">Hủy bỏ</Button
        ><Button variant="destructive" @click="confirmDelete"
          >Xóa địa chỉ</Button
        ></DialogFooter
      ></DialogContent
    ></Dialog
  >
</template>
