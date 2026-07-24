<script setup lang="ts">
import { Check, ChevronsUpDown, LoaderCircle } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import type { CustomerAddressResponseDto } from "@/api/generated/models";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

const props = defineProps<{
  addresses: CustomerAddressResponseDto[];
  selectedId: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
}>();

const emit = defineEmits<{
  select: [addressId: string];
  retry: [];
}>();

const open = ref(false);
const search = ref("");
const activeIndex = ref(0);

const selectedAddress = computed(() =>
  props.addresses.find((address) => address.id === props.selectedId),
);
const filteredAddresses = computed(() => {
  const query = search.value.trim().toLocaleLowerCase("vi-VN");
  if (!query) return props.addresses;
  return props.addresses.filter((address) =>
    [
      address.label,
      address.formattedAddress,
      address.recipientName,
      address.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("vi-VN")
      .includes(query),
  );
});

watch(filteredAddresses, () => {
  activeIndex.value = 0;
});

function handleOpenChange(nextOpen: boolean): void {
  open.value = nextOpen;
  if (nextOpen) {
    search.value = "";
    activeIndex.value = Math.max(
      0,
      filteredAddresses.value.findIndex(
        (address) => address.id === props.selectedId,
      ),
    );
  }
}

function selectAddress(addressId: string): void {
  open.value = false;
  if (addressId !== props.selectedId) emit("select", addressId);
}

function handleSearchKeydown(event: KeyboardEvent): void {
  const lastIndex = filteredAddresses.value.length - 1;
  if (event.key === "ArrowDown" && lastIndex >= 0) {
    event.preventDefault();
    activeIndex.value =
      activeIndex.value >= lastIndex ? 0 : activeIndex.value + 1;
  } else if (event.key === "ArrowUp" && lastIndex >= 0) {
    event.preventDefault();
    activeIndex.value =
      activeIndex.value <= 0 ? lastIndex : activeIndex.value - 1;
  } else if (event.key === "Enter") {
    const address = filteredAddresses.value[activeIndex.value];
    if (!address) return;
    event.preventDefault();
    selectAddress(address.id);
  }
}
</script>

<template>
  <Skeleton v-if="loading" class="h-11 w-full rounded-md" />
  <div
    v-else-if="error"
    class="flex min-h-11 items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 text-sm text-red-700"
  >
    <span>Không thể tải địa chỉ đã lưu.</span>
    <Button type="button" variant="link" class="h-auto p-0" @click="emit('retry')">
      Thử lại
    </Button>
  </div>
  <Popover v-else :open="open" @update:open="handleOpenChange">
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        :aria-expanded="open"
        aria-label="Chọn địa chỉ đã lưu"
        data-testid="checkout-address-trigger"
        class="h-auto min-h-11 w-full justify-between gap-3 px-3 py-2 text-left font-normal"
        :disabled="disabled"
      >
        <span v-if="selectedAddress" class="min-w-0">
          <span class="flex flex-wrap items-center gap-2">
            <strong class="font-medium">{{
              selectedAddress.label || "Địa chỉ"
            }}</strong>
            <span
              v-if="selectedAddress.isDefault"
              class="rounded bg-green-100 px-1.5 py-0.5 text-[11px] text-green-700"
            >
              Mặc định
            </span>
          </span>
          <span class="mt-0.5 block truncate text-xs text-muted-foreground">
            {{ selectedAddress.formattedAddress }}
          </span>
        </span>
        <span v-else class="text-muted-foreground">Chọn địa chỉ đã lưu</span>
        <LoaderCircle v-if="disabled" class="size-4 shrink-0 animate-spin" />
        <ChevronsUpDown v-else class="size-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      class="z-[70] w-[var(--reka-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
    >
      <Command>
        <CommandInput
          v-model="search"
          aria-label="Tìm địa chỉ đã lưu"
          placeholder="Tìm theo nhãn, địa chỉ hoặc người nhận"
          @keydown="handleSearchKeydown"
        />
        <CommandList class="h-72">
          <p
            v-if="filteredAddresses.length === 0"
            class="px-3 py-8 text-center text-sm text-muted-foreground"
          >
            {{
              addresses.length
                ? "Không tìm thấy địa chỉ phù hợp."
                : "Bạn chưa có địa chỉ đã lưu."
            }}
          </p>
          <CommandItem
            v-for="(address, index) in filteredAddresses"
            :id="`checkout-address-${address.id}`"
            :key="address.id"
            :selected="address.id === selectedId"
            :active="index === activeIndex"
            class="items-start py-3"
            @mouseenter="activeIndex = index"
            @click="selectAddress(address.id)"
          >
            <Check
              class="mt-0.5 size-4 shrink-0 text-green-700"
              :class="address.id === selectedId ? 'opacity-100' : 'opacity-0'"
            />
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                <strong>{{ address.label || "Địa chỉ" }}</strong>
                <span
                  v-if="address.isDefault"
                  class="rounded bg-green-100 px-1.5 py-0.5 text-[11px] text-green-700"
                >
                  Mặc định
                </span>
              </span>
              <span class="mt-1 block whitespace-normal leading-5 text-slate-600">
                {{ address.formattedAddress }}
              </span>
              <span class="mt-1 block text-xs text-slate-500">
                {{ address.recipientName }} · {{ address.phone }}
              </span>
            </span>
          </CommandItem>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
