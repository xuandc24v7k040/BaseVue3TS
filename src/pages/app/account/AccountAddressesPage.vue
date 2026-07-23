<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { Info, LoaderCircle, Plus } from "@lucide/vue";
import { toast } from "vue-sonner";
import type {
  CreateCustomerAddressDto,
  CustomerAddressResponseDto,
} from "@/api/generated/models";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "@/features/customer-account/api/customer-account-api";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import { useCustomerAddresses } from "@/features/customer-account/composables/use-customer-account";
import { customerAddressSchema } from "@/features/customer-account/schemas/customer-account.schema";
import { customerAccountErrorMessage } from "@/features/customer-account/utils/customer-account-errors";
import BranchAdministrativeUnitCombobox from "@/features/branches/components/BranchAdministrativeUnitCombobox.vue";
import {
  useVietnamProvinces,
  useVietnamWards,
} from "@/features/branches/composables/use-vietnam-administrative-units";
import { focusFirstInvalidField } from "@/features/product-master-data/utils/focus-first-invalid-field";

interface AddressForm {
  label: string;
  recipientName: string;
  phone: string;
  provinceCode: number | null;
  wardCode: number | null;
  addressDetail: string;
  isDefault: boolean;
}

type AddressField = keyof AddressForm;
type AddressErrors = Partial<Record<AddressField, string>>;
interface SaveAddressRequest {
  id: string | null;
  payload: CreateCustomerAddressDto;
}

const queryClient = useQueryClient();
const addressesQuery = useCustomerAddresses();
const provincesQuery = useVietnamProvinces();
const sheetOpen = ref(false);
const deleteOpen = ref(false);
const editingId = ref<string | null>(null);
const deleting = ref<CustomerAddressResponseDto | null>(null);
const provinceLabel = ref("");
const wardLabel = ref("");
const emptyForm = (): AddressForm => ({
  label: "",
  recipientName: "",
  phone: "",
  provinceCode: null,
  wardCode: null,
  addressDetail: "",
  isDefault: false,
});
const form = reactive<AddressForm>(emptyForm());
const errors = reactive<AddressErrors>({});
const wardsQuery = useVietnamWards(computed(() => form.provinceCode));
const addresses = computed(() => addressesQuery.data.value ?? []);

const saveMutation = useMutation({
  mutationFn: ({ id, payload }: SaveAddressRequest) => {
    return id
      ? updateCustomerAddress(id, payload)
      : createCustomerAddress(payload);
  },
  onSuccess: async (_response, request) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.addresses(),
      }),
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.profile(),
      }),
    ]);
    toast.success(
      request.id ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ.",
    );
    sheetOpen.value = false;
    resetAddressState();
  },
  onError: (error) => {
    toast.error(customerAccountErrorMessage(error, "Không thể lưu địa chỉ."));
  },
});

const defaultMutation = useMutation({
  mutationFn: setDefaultCustomerAddress,
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.addresses(),
      }),
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.profile(),
      }),
    ]);
    toast.success("Đã đặt địa chỉ mặc định.");
  },
  onError: (error) =>
    toast.error(
      customerAccountErrorMessage(error, "Không thể đặt địa chỉ mặc định."),
    ),
});

const deleteMutation = useMutation({
  mutationFn: (addressId: string) => deleteCustomerAddress(addressId),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.addresses(),
      }),
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.profile(),
      }),
    ]);
    deleteOpen.value = false;
    deleting.value = null;
    toast.success("Đã xóa địa chỉ.");
  },
  onError: (error) =>
    toast.error(customerAccountErrorMessage(error, "Không thể xóa địa chỉ.")),
});

function openAdd(): void {
  resetAddressState();
  sheetOpen.value = true;
}

function openEdit(address: CustomerAddressResponseDto): void {
  resetAddressState();
  editingId.value = address.id;
  Object.assign(form, {
    label: address.label ?? "",
    recipientName: address.recipientName,
    phone: address.phone,
    provinceCode: address.provinceCode,
    wardCode: address.wardCode,
    addressDetail: address.addressDetail,
    isDefault: address.isDefault,
  });
  provinceLabel.value = address.provinceName;
  wardLabel.value = address.wardName;
  sheetOpen.value = true;
}

function resetAddressState(): void {
  editingId.value = null;
  Object.assign(form, emptyForm());
  provinceLabel.value = "";
  wardLabel.value = "";
  clearErrors();
}

function clearErrors(): void {
  Object.keys(errors).forEach((field) => {
    delete errors[field as AddressField];
  });
}

function updateSheetOpen(open: boolean): void {
  if (!open && saveMutation.isPending.value) return;
  sheetOpen.value = open;
  if (!open) resetAddressState();
}

function validateField(field: AddressField): void {
  if (!errors[field]) return;
  const parsed = customerAddressSchema.safeParse(form);
  if (parsed.success) {
    delete errors[field];
    return;
  }
  const issue = parsed.error.issues.find((item) => item.path[0] === field);
  if (issue) errors[field] = issue.message;
  else delete errors[field];
}

function updateTextField(
  field: "label" | "recipientName" | "phone" | "addressDetail",
  value: string | number,
): void {
  form[field] = String(value);
  validateField(field);
}

function changeProvince(value: number): void {
  const province = provincesQuery.data.value?.find((item) => item.code === value);
  form.provinceCode = value;
  provinceLabel.value = province?.name ?? "";
  form.wardCode = null;
  wardLabel.value = "";
  delete errors.provinceCode;
  delete errors.wardCode;
}

function changeWard(value: number): void {
  const ward = wardsQuery.data.value?.find((item) => item.code === value);
  form.wardCode = value;
  wardLabel.value = ward?.name ?? "";
  delete errors.wardCode;
}

async function submitAddress(): Promise<void> {
  if (saveMutation.isPending.value) return;
  const parsed = customerAddressSchema.safeParse(form);
  if (!parsed.success) {
    clearErrors();
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as AddressField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    });
    await focusFirstInvalidField("customer-address-form");
    return;
  }

  const payload: CreateCustomerAddressDto = {
    label: parsed.data.label,
    recipientName: parsed.data.recipientName,
    phone: parsed.data.phone,
    provinceCode: parsed.data.provinceCode,
    wardCode: parsed.data.wardCode,
    addressDetail: parsed.data.addressDetail,
    isDefault: parsed.data.isDefault,
  };
  saveMutation.mutate({ id: editingId.value, payload });
}

function askDelete(address: CustomerAddressResponseDto): void {
  deleting.value = address;
  deleteOpen.value = true;
}

function updateDeleteOpen(open: boolean): void {
  if (!open && deleteMutation.isPending.value) return;
  deleteOpen.value = open;
  if (!open) deleting.value = null;
}

function confirmDelete(): void {
  if (!deleting.value || deleteMutation.isPending.value) return;
  deleteMutation.mutate(deleting.value.id);
}
</script>

<template>
  <Card class="min-w-0 p-5 shadow-none sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold">Địa chỉ của tôi</h1>
        <p class="mt-1 text-sm text-[var(--bookora-muted)]">
          Quản lý và chọn địa chỉ giao hàng của bạn
        </p>
      </div>
      <Button
        class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]"
        :disabled="addresses.length >= 10"
        @click="openAdd"
        ><Plus class="size-4" />Thêm địa chỉ</Button
      >
    </div>

    <div
      v-if="addressesQuery.isPending.value"
      class="py-12 text-center text-sm text-[var(--bookora-muted)]"
    >
      Đang tải địa chỉ...
    </div>
    <div v-else-if="addressesQuery.isError.value" class="py-12 text-center">
      <p class="text-sm text-destructive">Không thể tải danh sách địa chỉ.</p>
      <Button class="mt-3" variant="outline" @click="addressesQuery.refetch()"
        >Thử lại</Button
      >
    </div>
    <div
      v-else-if="addresses.length === 0"
      class="mt-6 rounded-xl border border-dashed p-10 text-center"
    >
      <p class="font-medium">Bạn chưa có địa chỉ giao hàng.</p>
      <p class="mt-1 text-sm text-[var(--bookora-muted)]">
        Thêm địa chỉ đầu tiên để dùng khi đặt hàng.
      </p>
      <Button class="mt-4 bg-[var(--bookora-green)] text-white" @click="openAdd"
        ><Plus class="size-4" />Thêm địa chỉ</Button
      >
    </div>
    <div v-else class="mt-6 grid min-w-0 auto-rows-fr gap-4 lg:grid-cols-2">
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
            {{ address.recipientName }} <span class="mx-2 text-border">|</span
            >{{ address.phone }}
          </p>
          <p
            class="mt-4 break-words text-sm leading-7 text-[var(--bookora-muted)]"
          >
            {{ address.formattedAddress }}
          </p>
        </div>
        <div class="mt-5 flex flex-wrap justify-end divide-x text-sm">
          <button
            v-if="!address.isDefault"
            type="button"
            class="px-3 hover:text-[var(--bookora-green)]"
            :disabled="defaultMutation.isPending.value"
            @click="defaultMutation.mutate(address.id)"
          >
            Đặt mặc định
          </button>
          <button
            type="button"
            class="px-3 hover:text-destructive"
            @click="askDelete(address)"
          >
            Xóa
          </button>
          <button
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
      class="mt-4 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700"
    >
      <Info class="size-5 shrink-0" />Bạn có thể lưu tối đa 10 địa chỉ giao
      hàng.
    </div>
  </Card>

  <Sheet :open="sheetOpen" @update:open="updateSheetOpen">
    <SheetContent
      class="bookora-client w-full min-w-0 max-w-full p-0 sm:max-w-xl"
    >
      <SheetHeader class="border-b px-5 py-4"
        ><SheetTitle>{{
          editingId ? "Cập nhật địa chỉ" : "Thêm địa chỉ"
        }}</SheetTitle
        ><SheetDescription
          >Bookora sử dụng mô hình địa chỉ hai cấp: Tỉnh/Thành phố và
          Phường/Xã.</SheetDescription
        ></SheetHeader
      >
      <form
        id="customer-address-form"
        novalidate
        class="flex min-h-0 flex-1 flex-col"
        @submit.prevent="submitAddress"
      >
        <ScrollArea class="min-h-0 flex-1"
          ><div class="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <label class="grid content-start gap-1 text-sm sm:col-span-2"
              >Đặt tên địa chỉ (tùy chọn)<Input
                :model-value="form.label"
                maxlength="50"
                @update:model-value="updateTextField('label', $event)"
            /></label>
            <label class="grid content-start gap-1 text-sm"
              >Họ và tên<Input
                id="customer-address-recipient-name"
                :model-value="form.recipientName"
                maxlength="100"
                :aria-invalid="Boolean(errors.recipientName)"
                @update:model-value="updateTextField('recipientName', $event)"
              /><span v-if="errors.recipientName" role="alert" class="text-sm text-destructive">{{ errors.recipientName }}</span></label>
            <label class="grid content-start gap-1 text-sm"
              >Số điện thoại<Input
                id="customer-address-phone"
                :model-value="form.phone"
                inputmode="tel"
                :aria-invalid="Boolean(errors.phone)"
                @update:model-value="updateTextField('phone', $event)"
              /><span v-if="errors.phone" role="alert" class="text-sm text-destructive">{{ errors.phone }}</span></label>
            <label class="grid content-start gap-1 text-sm"
              >Tỉnh/Thành phố<BranchAdministrativeUnitCombobox
                :model-value="form.provinceCode"
                :options="provincesQuery.data.value ?? []"
                :fallback-label="provinceLabel"
                :loading="provincesQuery.isPending.value"
                :error="provincesQuery.isError.value"
                :invalid="Boolean(errors.provinceCode)"
                placeholder="Chọn tỉnh/thành phố"
                search-placeholder="Tìm tỉnh/thành phố..."
                @update:model-value="changeProvince"
                @retry="provincesQuery.refetch()"
              /><span v-if="errors.provinceCode" role="alert" class="text-sm text-destructive">{{ errors.provinceCode }}</span></label
            >
            <label class="grid content-start gap-1 text-sm"
              >Phường/Xã<BranchAdministrativeUnitCombobox
                :model-value="form.wardCode"
                :options="wardsQuery.data.value ?? []"
                :fallback-label="wardLabel"
                :loading="wardsQuery.isPending.value && form.provinceCode !== null"
                :error="wardsQuery.isError.value"
                :disabled="form.provinceCode === null"
                :invalid="Boolean(errors.wardCode)"
                placeholder="Chọn phường/xã"
                search-placeholder="Tìm phường/xã..."
                @update:model-value="changeWard"
                @retry="wardsQuery.refetch()"
              /><span v-if="errors.wardCode" role="alert" class="text-sm text-destructive">{{ errors.wardCode }}</span></label
            >
            <label class="grid content-start gap-1 text-sm sm:col-span-2"
              >Địa chỉ chi tiết<textarea
                id="customer-address-detail"
                :value="form.addressDetail"
                maxlength="255"
                class="min-h-24 rounded-md border bg-transparent p-3 outline-none focus:ring-2 focus:ring-[var(--bookora-green)]"
                :class="errors.addressDetail && 'border-destructive'"
                :aria-invalid="Boolean(errors.addressDetail)"
                @input="updateTextField('addressDetail', ($event.target as HTMLTextAreaElement).value)"
              /><span v-if="errors.addressDetail" role="alert" class="text-sm text-destructive">{{ errors.addressDetail }}</span>
            </label>
            <label
              class="flex items-center justify-between gap-4 text-sm sm:col-span-2"
              >Đặt làm địa chỉ mặc định<button
                type="button"
                role="switch"
                :aria-checked="form.isDefault"
                class="relative h-6 w-11 rounded-full transition-colors"
                :class="
                  form.isDefault ? 'bg-[var(--bookora-green)]' : 'bg-muted'
                "
                @click="form.isDefault = !form.isDefault"
              >
                <span
                  class="absolute top-1 size-4 rounded-full bg-white transition-all"
                  :class="form.isDefault ? 'left-6' : 'left-1'"
                /></button
            ></label></div
        ></ScrollArea>
        <SheetFooter class="grid grid-cols-2 gap-2.5 border-t px-5 py-4"
          ><Button
            type="button"
            variant="outline"
            :disabled="saveMutation.isPending.value"
            @click="updateSheetOpen(false)"
            >Hủy bỏ</Button
          ><Button
            type="submit"
            class="bg-[var(--bookora-green)] text-white"
            :disabled="saveMutation.isPending.value"
            ><LoaderCircle
              v-if="saveMutation.isPending.value"
              class="size-4 animate-spin"
            />{{ editingId ? "Lưu thay đổi" : "Thêm địa chỉ" }}</Button
          ></SheetFooter
        >
      </form>
    </SheetContent>
  </Sheet>

  <Dialog :open="deleteOpen" @update:open="updateDeleteOpen">
    <DialogContent class="bookora-client w-[min(32rem,calc(100vw-2rem))]">
      <DialogHeader>
        <DialogTitle>Xóa địa chỉ?</DialogTitle>
        <DialogDescription>
          Bạn có chắc muốn xóa “{{ deleting?.label || "Địa chỉ" }}”? Nếu đây là
          địa chỉ mặc định, địa chỉ cũ nhất còn lại sẽ được chọn thay thế.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          :disabled="deleteMutation.isPending.value"
          @click="updateDeleteOpen(false)"
        >
          Hủy bỏ
        </Button>
        <Button
          type="button"
          variant="destructive"
          :disabled="deleteMutation.isPending.value"
          @click="confirmDelete"
        >
          <LoaderCircle
            v-if="deleteMutation.isPending.value"
            class="size-4 animate-spin"
          />
          Xóa địa chỉ
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
