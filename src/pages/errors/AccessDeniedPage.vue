<script setup lang="ts">
import { LogOut, ShieldX } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthLogout } from "@/composables/use-auth-logout";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const { isLoggingOut, logout } = useAuthLogout();
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-muted/30 px-4 py-10 text-foreground">
    <Card class="w-full max-w-lg rounded-2xl shadow-sm">
      <CardHeader class="space-y-4">
        <div class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX class="size-6" aria-hidden="true" />
        </div>
        <div class="space-y-2">
          <CardTitle class="text-2xl">Không có quyền truy cập</CardTitle>
          <CardDescription class="max-w-[65ch] leading-6">
            Bạn đã đăng nhập thành công, nhưng tài khoản này không có quyền truy cập khu vực quản trị Bookora.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent v-if="authStore.user" class="grid gap-2 text-sm">
        <p class="font-medium">{{ authStore.user.fullName }}</p>
        <p class="text-muted-foreground">{{ authStore.user.email }}</p>
        <p class="text-muted-foreground">Loại tài khoản: {{ authStore.user.type }}</p>
      </CardContent>
      <CardFooter>
        <Button :disabled="isLoggingOut" @click="logout">
          <LogOut class="size-4" aria-hidden="true" />
          {{ isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất" }}
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
