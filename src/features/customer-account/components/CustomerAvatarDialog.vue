<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { LoaderCircle } from "@lucide/vue";
import { toast } from "vue-sonner";
import type { CustomerProfileResponseDto } from "@/api/generated/models";
import ImageDropzone from "@/components/shared/ImageDropzone.vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  removeCustomerAvatar,
  uploadCustomerAvatar,
} from "@/features/customer-account/api/customer-account-api";
import { customerAccountKeys } from "@/features/customer-account/api/customer-account-query-keys";
import { customerAccountErrorMessage } from "@/features/customer-account/utils/customer-account-errors";
import { useAuthStore } from "@/stores/auth.store";

const props = defineProps<{
  open: boolean;
  avatarUrl?: string | null;
  fullName: string;
}>();

const emit = defineEmits<{ "update:open": [open: boolean] }>();
const authStore = useAuthStore();
const queryClient = useQueryClient();
const selectedFile = ref<File | null>(null);
const removeRequested = ref(false);
const fileError = ref("");

const uploadMutation = useMutation({
  mutationFn: uploadCustomerAvatar,
  onSuccess: async (profile) => {
    await refreshIdentity(profile);
    toast.success(props.avatarUrl ? "Đã thay ảnh đại diện." : "Đã thêm ảnh đại diện.");
    close();
  },
  onError: (error) => {
    toast.error(
      customerAccountErrorMessage(error, "Không thể cập nhật ảnh đại diện."),
    );
  },
});

const deleteMutation = useMutation({
  mutationFn: removeCustomerAvatar,
  onSuccess: async (profile) => {
    await refreshIdentity(profile);
    toast.success("Đã gỡ ảnh đại diện.");
    close();
  },
  onError: (error) => {
    toast.error(
      customerAccountErrorMessage(error, "Không thể gỡ ảnh đại diện."),
    );
  },
});

const pending = computed(
  () => uploadMutation.isPending.value || deleteMutation.isPending.value,
);
const effectiveCurrentUrl = computed(() =>
  removeRequested.value ? null : props.avatarUrl,
);
const hasChanges = computed(
  () => selectedFile.value !== null || removeRequested.value,
);

watch(
  () => props.open,
  () => resetLocalState(),
);

async function refreshIdentity(
  profile: CustomerProfileResponseDto,
): Promise<void> {
  queryClient.setQueryData(customerAccountKeys.profile(), profile);
  try {
    await authStore.refreshCurrentUser();
  } catch {
    await queryClient.invalidateQueries({
      queryKey: customerAccountKeys.profile(),
    });
  }
}

function resetLocalState(): void {
  selectedFile.value = null;
  removeRequested.value = false;
  fileError.value = "";
  uploadMutation.reset();
  deleteMutation.reset();
}

function updateOpen(open: boolean): void {
  if (!open && pending.value) return;
  emit("update:open", open);
}

function close(): void {
  emit("update:open", false);
}

function submit(): void {
  if (pending.value) return;
  if (selectedFile.value) {
    uploadMutation.mutate(selectedFile.value);
    return;
  }
  if (removeRequested.value) deleteMutation.mutate();
}

function remove(): void {
  if (!props.avatarUrl || pending.value) return;
  selectedFile.value = null;
  removeRequested.value = true;
}

function handleInvalid(message: string): void {
  fileError.value = message;
  toast.error(message);
}
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      class="bookora-client flex max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
    >
      <DialogHeader class="shrink-0 border-b px-5 py-4">
        <DialogTitle>Quản lý ảnh đại diện</DialogTitle>
        <DialogDescription>
          Chọn ảnh JPEG, PNG hoặc WebP có dung lượng tối đa 5 MB.
        </DialogDescription>
      </DialogHeader>

      <div class="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea type="auto" class="h-full min-h-0 flex-1">
          <div class="space-y-3 px-5 py-4">
            <ImageDropzone
              v-model="selectedFile"
              :current-url="effectiveCurrentUrl"
              :disabled="pending"
              :image-alt="`Ảnh đại diện ${fullName}`"
              @remove="remove"
              @invalid="handleInvalid"
              @valid="fileError = ''"
            />
            <p v-if="fileError" role="alert" class="text-sm text-destructive">
              {{ fileError }}
            </p>
          </div>
        </ScrollArea>
      </div>

      <DialogFooter class="grid shrink-0 grid-cols-2 gap-2.5 border-t px-5 py-4">
        <Button type="button" variant="outline" :disabled="pending" @click="close">
          Hủy bỏ
        </Button>
        <Button
          type="button"
          class="bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)] disabled:bg-[var(--bookora-green)] disabled:text-white"
          :disabled="!hasChanges || pending"
          @click="submit"
        >
          <LoaderCircle v-if="pending" class="size-4 animate-spin" />
          {{ avatarUrl ? "Lưu thay đổi" : "Tải ảnh lên" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
