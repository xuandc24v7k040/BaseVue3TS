<script setup lang="ts">
import { Loader2 } from "@lucide/vue";
import { useMeQuery } from "@/api/queries/useMeQuery";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const meQuery = useMeQuery();
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p class="mt-2 text-muted-foreground">
        Ready for analytics, semantic search, chatbot, and recommendation
        modules.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Server state</p>
        <p class="mt-2 text-2xl font-semibold">TanStack Query</p>
      </div>
      <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Client state</p>
        <p class="mt-2 text-2xl font-semibold">Pinia</p>
      </div>
      <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">HTTP</p>
        <p class="mt-2 text-2xl font-semibold">Axios</p>
      </div>
      <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">UI</p>
        <p class="mt-2 text-2xl font-semibold">shadcn-vue</p>
      </div>
    </div>

    <div class="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div
        v-if="meQuery.isLoading.value"
        class="flex items-center gap-2 text-muted-foreground"
      >
        <Loader2 class="h-4 w-4 animate-spin" />
        Đang tải hồ sơ...
      </div>

      <p v-else-if="meQuery.isError.value" class="text-sm text-destructive">
        Không thể tải hồ sơ. Hãy kiểm tra endpoint xác thực của backend.
      </p>

      <pre v-else class="overflow-auto rounded-md bg-muted p-4 text-sm">{{
        meQuery.data.value
      }}</pre>
    </div>
    <div class="mt-4 flex items-center gap-2">
      <Button variant="destructive"> Button </Button>
      <Select>
        <SelectTrigger class="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple"> Apple </SelectItem>
            <SelectItem value="banana"> Banana </SelectItem>
            <SelectItem value="blueberry"> Blueberry </SelectItem>
            <SelectItem value="grapes"> Grapes </SelectItem>
            <SelectItem value="pineapple"> Pineapple </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  </section>
</template>
