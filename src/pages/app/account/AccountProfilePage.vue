<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { Eye, EyeOff, Link2Off, LoaderCircle, Pencil } from "@lucide/vue";
import { toast } from "vue-sonner";
import type { UpdateCustomerProfileDto } from "@/api/generated/models";
import googleLogo from "@/assets/client/auth/google-logo.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  changeCustomerPassword,
  updateCustomerProfile,
} from "@/features/customer-account/api/customer-account-api";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import {
  useCustomerAddresses,
  useCustomerProfile,
} from "@/features/customer-account/composables/use-customer-account";
import {
  customerPasswordSchema,
  customerProfileSchema,
} from "@/features/customer-account/schemas/customer-account.schema";
import { customerAccountErrorMessage } from "@/features/customer-account/utils/customer-account-errors";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const queryClient = useQueryClient();
const profileQuery = useCustomerProfile();
const addressesQuery = useCustomerAddresses();
const editOpen = ref(false);
const passwordOpen = ref(false);
const form = reactive({
  fullName: "",
  phone: "",
  gender: "",
  birthday: "",
  defaultAddressId: "",
});
const password = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const visible = reactive({
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
});

const profile = computed(() => profileQuery.data.value);
const profileMutation = useMutation({
  mutationFn: async () => {
    const parsed = customerProfileSchema.safeParse(form);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    const payload: UpdateCustomerProfileDto = {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      gender: (parsed.data.gender === "unspecified"
        ? null
        : parsed.data.gender) as UpdateCustomerProfileDto["gender"],
      birthday: (parsed.data.birthday ||
        null) as UpdateCustomerProfileDto["birthday"],
      ...(parsed.data.defaultAddressId
        ? { defaultAddressId: parsed.data.defaultAddressId }
        : {}),
    };
    await updateCustomerProfile(payload);
  },
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.profile(),
      }),
      queryClient.invalidateQueries({
        queryKey: customerAccountKeys.addresses(),
      }),
      authStore.refreshCurrentUser(),
    ]);
    editOpen.value = false;
    toast.success("Đã cập nhật thông tin cá nhân.");
  },
  onError: (error) =>
    toast.error(
      error instanceof Error && !("response" in error)
        ? error.message
        : customerAccountErrorMessage(
            error,
            "Không thể cập nhật thông tin cá nhân.",
          ),
    ),
});

const passwordMutation = useMutation({
  mutationFn: async () => {
    const parsed = customerPasswordSchema.safeParse(password);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    await changeCustomerPassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
  },
  onSuccess: async () => {
    Object.assign(password, {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    passwordOpen.value = false;
    await authStore.refreshCurrentUser();
    toast.success(
      "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được đăng xuất.",
    );
  },
  onError: (error) =>
    toast.error(
      error instanceof Error && !("response" in error)
        ? error.message
        : customerAccountErrorMessage(error, "Không thể đổi mật khẩu."),
    ),
});

function openEdit(): void {
  if (!profile.value) return;
  Object.assign(form, {
    fullName: profile.value.fullName,
    phone: profile.value.phone ?? "",
    gender: profile.value.gender ?? "unspecified",
    birthday: profile.value.birthday ?? "",
    defaultAddressId: profile.value.defaultAddress?.id ?? "",
  });
  editOpen.value = true;
}

function displayValue(value: string | null | undefined): string {
  return value || "Chưa có dữ liệu";
}

function displayGender(value: string | null | undefined): string {
  return (
    { male: "Nam", female: "Nữ", other: "Khác" }[value ?? ""] ??
    "Chưa có dữ liệu"
  );
}

function displayBirthday(value: string | null | undefined): string {
  return value ? value.split("-").reverse().join("/") : "Chưa có dữ liệu";
}
</script>

<template>
  <div class="grid min-w-0 gap-5">
    <Card
      v-if="profileQuery.isPending.value"
      class="p-8 text-sm text-[var(--bookora-muted)]"
      >Đang tải thông tin tài khoản...</Card
    >
    <Card v-else-if="profileQuery.isError.value" class="p-8">
      <p class="text-sm text-destructive">Không thể tải thông tin tài khoản.</p>
      <Button class="mt-3" variant="outline" @click="profileQuery.refetch()"
        >Thử lại</Button
      >
    </Card>
    <template v-else-if="profile">
      <Card class="min-w-0 p-5 shadow-none sm:p-6">
        <div class="flex justify-end">
          <Button
            variant="ghost"
            class="text-[var(--bookora-green)]"
            @click="openEdit"
            ><Pencil class="size-4" />Cập nhật</Button
          >
        </div>
        <div class="mt-4 grid min-w-0 gap-x-10 md:grid-cols-2">
          <dl class="grid">
            <div
              v-for="row in [
                ['Họ và tên', profile.fullName],
                ['Giới tính', displayGender(profile.gender)],
                ['Ngày sinh', displayBirthday(profile.birthday)],
              ]"
              :key="row[0]"
              class="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b py-3.5 text-sm"
            >
              <dt class="text-[var(--bookora-muted)]">{{ row[0] }}:</dt>
              <dd class="min-w-0 text-right break-words">{{ row[1] }}</dd>
            </div>
          </dl>
          <dl class="grid">
            <div
              v-for="row in [
                ['Số điện thoại', displayValue(profile.phone)],
                ['Email', profile.email],
                [
                  'Địa chỉ mặc định',
                  displayValue(profile.defaultAddress?.formattedAddress),
                ],
              ]"
              :key="row[0]"
              class="grid min-w-0 grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b py-3.5 text-sm"
            >
              <dt class="text-[var(--bookora-muted)]">{{ row[0] }}:</dt>
              <dd class="min-w-0 text-right break-words">{{ row[1] }}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div class="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card class="p-5 shadow-none">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-bold">Mật khẩu</h2>
            <Button
              v-if="profile.hasLocalPassword"
              variant="ghost"
              class="text-[var(--bookora-green)]"
              @click="passwordOpen = true"
              ><Pencil class="size-4" />Thay đổi mật khẩu</Button
            >
          </div>
          <p class="mt-4 text-sm text-[var(--bookora-muted)]">
            {{
              profile.hasLocalPassword
                ? "Bạn có thể đổi mật khẩu Bookora tại đây."
                : "Tài khoản này đăng nhập qua nhà cung cấp liên kết."
            }}
          </p>
        </Card>
        <Card class="p-5 shadow-none"
          ><h2 class="text-lg font-bold">Tài khoản liên kết</h2>
          <div class="mt-4 flex items-center gap-3">
            <img :src="googleLogo" alt="Google" class="size-7" /><span
              >Google</span
            ><Badge variant="outline">{{
              profile.provider === "GOOGLE" ? "Đã liên kết" : "Chưa liên kết"
            }}</Badge
            ><button
              type="button"
              disabled
              class="ml-auto inline-flex items-center gap-1 text-sm opacity-50"
            >
              <Link2Off class="size-4" />Hủy liên kết
            </button>
          </div></Card
        >
      </div>
    </template>

    <Sheet v-model:open="editOpen">
      <SheetContent
        class="bookora-client w-full min-w-0 max-w-full p-0 sm:max-w-xl"
      >
        <SheetHeader class="border-b px-5 py-4"
          ><SheetTitle>Cập nhật thông tin cá nhân</SheetTitle
          ><SheetDescription
            >Email là thông tin đăng nhập và không thể thay
            đổi.</SheetDescription
          ></SheetHeader
        >
        <form
          class="flex min-h-0 flex-1 flex-col"
          @submit.prevent="profileMutation.mutate()"
        >
          <ScrollArea class="min-h-0 flex-1"
            ><div class="grid gap-4 px-5 py-4">
              <label class="grid gap-1 text-sm"
                >Họ và tên<Input
                  v-model="form.fullName"
                  required
                  maxlength="100"
              /></label>
              <label class="grid gap-1 text-sm"
                >Giới tính<Select v-model="form.gender"
                  ><SelectTrigger class="w-full"
                    ><SelectValue placeholder="Không cung cấp" /></SelectTrigger
                  ><SelectContent
                    ><SelectItem value="unspecified">Không cung cấp</SelectItem
                    ><SelectItem value="male">Nam</SelectItem
                    ><SelectItem value="female">Nữ</SelectItem
                    ><SelectItem value="other">Khác</SelectItem></SelectContent
                  ></Select
                ></label
              >
              <label class="grid gap-1 text-sm"
                >Ngày sinh<Input
                  v-model="form.birthday"
                  type="date"
                  :max="new Date().toISOString().slice(0, 10)"
              /></label>
              <label class="grid gap-1 text-sm"
                >Số điện thoại<Input
                  v-model="form.phone"
                  inputmode="tel"
                  placeholder="0901234567"
              /></label>
              <label class="grid gap-1 text-sm"
                >Email<Input
                  :model-value="profile?.email"
                  disabled
                  readonly
                /><span class="text-xs text-[var(--bookora-muted)]"
                  >Khách hàng không được sửa email.</span
                ></label
              >
              <label class="grid gap-1 text-sm"
                >Địa chỉ mặc định<Select v-model="form.defaultAddressId"
                  ><SelectTrigger class="w-full min-w-0"
                    ><SelectValue
                      placeholder="Chưa có địa chỉ" /></SelectTrigger
                  ><SelectContent
                    ><SelectItem
                      v-for="address in addressesQuery.data.value ?? []"
                      :key="address.id"
                      :value="address.id"
                      >{{ address.label || "Địa chỉ" }} —
                      {{ address.formattedAddress }}</SelectItem
                    ></SelectContent
                  ></Select
                ></label
              >
            </div></ScrollArea
          >
          <SheetFooter class="grid grid-cols-2 gap-2.5 border-t px-5 py-4"
            ><Button
              type="button"
              variant="outline"
              :disabled="profileMutation.isPending.value"
              @click="openEdit"
              >Thiết lập lại</Button
            ><Button
              type="submit"
              class="bg-[var(--bookora-green)] text-white"
              :disabled="profileMutation.isPending.value"
              ><LoaderCircle
                v-if="profileMutation.isPending.value"
                class="size-4 animate-spin"
              />Cập nhật thông tin</Button
            ></SheetFooter
          >
        </form>
      </SheetContent>
    </Sheet>

    <Sheet v-model:open="passwordOpen">
      <SheetContent class="bookora-client w-full p-0 sm:max-w-lg">
        <SheetHeader class="border-b px-5 py-4"
          ><SheetTitle>Đổi mật khẩu</SheetTitle
          ><SheetDescription
            >Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.</SheetDescription
          ></SheetHeader
        >
        <form
          class="flex min-h-0 flex-1 flex-col"
          @submit.prevent="passwordMutation.mutate()"
        >
          <ScrollArea class="min-h-0 flex-1"
            ><div class="grid gap-4 px-5 py-4">
              <label
                v-for="field in [
                  { key: 'currentPassword', label: 'Mật khẩu hiện tại' },
                  { key: 'newPassword', label: 'Mật khẩu mới' },
                  { key: 'confirmPassword', label: 'Xác nhận mật khẩu mới' },
                ]"
                :key="field.key"
                class="grid gap-1 text-sm"
                >{{ field.label
                }}<span class="relative"
                  ><Input
                    v-model="password[field.key as keyof typeof password]"
                    :type="
                      visible[field.key as keyof typeof visible]
                        ? 'text'
                        : 'password'
                    "
                    class="pr-10" /><button
                    type="button"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    @click="
                      visible[field.key as keyof typeof visible] =
                        !visible[field.key as keyof typeof visible]
                    "
                  >
                    <EyeOff
                      v-if="visible[field.key as keyof typeof visible]"
                      class="size-4"
                    /><Eye v-else class="size-4" /></button></span
              ></label></div
          ></ScrollArea>
          <SheetFooter class="border-t px-5 py-4"
            ><Button
              type="submit"
              class="w-full bg-[var(--bookora-green)] text-white"
              :disabled="passwordMutation.isPending.value"
              ><LoaderCircle
                v-if="passwordMutation.isPending.value"
                class="size-4 animate-spin"
              />Đổi mật khẩu</Button
            ></SheetFooter
          >
        </form>
      </SheetContent>
    </Sheet>
  </div>
</template>
