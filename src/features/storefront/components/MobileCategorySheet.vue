<script setup lang="ts">
import { ChevronDown, Menu } from "@lucide/vue";
import { ref } from "vue";
import { RouterLink } from "vue-router";
import type { PublicCategoryResponseDto } from "@/api/generated/models";
import ClientBrand from "@/components/client/layout/ClientBrand.vue";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

defineProps<{
  categories: PublicCategoryResponseDto[];
  links: Array<{ label: string; href: string }>;
  accountTarget: string;
  accountLabel: string;
}>();

const open = ref(false);
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mở menu danh mục"
      >
        <Menu aria-hidden="true" class="size-6" />
      </Button>
    </SheetTrigger>
    <SheetContent
      side="left"
      class="bookora-client-theme flex w-[min(92vw,390px)] min-h-0 flex-col gap-0 border-[var(--bookora-border)] bg-[var(--bookora-cream)] p-0"
    >
      <SheetHeader
        class="shrink-0 border-b border-[var(--bookora-border)] p-5 text-left"
      >
        <SheetTitle><ClientBrand /></SheetTitle>
        <SheetDescription>Khám phá danh mục sách Bookora.</SheetDescription>
      </SheetHeader>
      <ScrollArea class="min-h-0 flex-1 px-4 py-3">
        <nav aria-label="Menu di động" class="grid gap-1">
          <SheetClose as-child>
            <RouterLink
              :to="accountTarget"
              class="rounded-md px-3 py-3 font-medium hover:bg-[var(--bookora-soft)]"
              >{{ accountLabel }}</RouterLink
            >
          </SheetClose>
          <SheetClose v-for="link in links" :key="link.label" as-child>
            <RouterLink
              :to="link.href"
              class="rounded-md px-3 py-3 font-medium hover:bg-[var(--bookora-soft)]"
              >{{ link.label }}</RouterLink
            >
          </SheetClose>
          <p
            class="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--bookora-muted)]"
          >
            Danh mục
          </p>
          <Collapsible
            v-for="category in categories"
            v-slot="{ open: categoryOpen }"
            :key="category.id"
            class="rounded-lg border border-transparent data-[state=open]:border-[var(--bookora-border)] data-[state=open]:bg-background"
          >
            <CollapsibleTrigger
              class="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-[var(--bookora-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bookora-green)]"
            >
              {{ category.name }}
              <ChevronDown
                aria-hidden="true"
                class="size-4 transition-transform"
                :class="categoryOpen ? 'rotate-180' : ''"
              />
            </CollapsibleTrigger>
            <CollapsibleContent class="grid pb-2 pl-3 pr-2">
              <SheetClose as-child>
                <RouterLink
                  :to="`/books?category=${category.slug}`"
                  class="rounded-md px-3 py-2 text-sm font-medium text-[var(--bookora-green)] hover:bg-[var(--bookora-soft)]"
                  >Xem tất cả {{ category.name }}</RouterLink
                >
              </SheetClose>
              <SheetClose
                v-for="child in category.children"
                :key="child.id"
                as-child
              >
                <RouterLink
                  :to="`/books?category=${child.slug}`"
                  class="rounded-md px-3 py-2 text-sm hover:bg-[var(--bookora-soft)]"
                  >{{ child.name }}</RouterLink
                >
              </SheetClose>
            </CollapsibleContent>
          </Collapsible>
        </nav>
      </ScrollArea>
      <SheetFooter
        class="shrink-0 border-t border-[var(--bookora-border)] bg-background p-4"
      >
        <SheetClose as-child
          ><Button type="button" variant="outline" class="w-full"
            >Đóng</Button
          ></SheetClose
        >
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
