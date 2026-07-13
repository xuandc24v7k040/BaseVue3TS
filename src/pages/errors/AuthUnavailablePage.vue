<script setup lang="ts">
import { RefreshCw, ServerOff } from "@lucide/vue";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardRouteForUserType, safeRedirectForUser } from "@/router";
import { useAuthStore } from "@/stores/auth.store";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isRetrying = ref(false);

async function retry(): Promise<void> {
  if (isRetrying.value) return;
  isRetrying.value = true;

  try {
    await authStore.retryBootstrap();

    if (authStore.status === "authenticated" && authStore.user) {
      await router.replace(
        safeRedirectForUser(router, route.query.redirect, authStore.user.type) ??
          dashboardRouteForUserType(authStore.user.type),
      );
    } else if (authStore.status === "anonymous") {
      await router.replace({ name: "admin-login" });
    } else {
      toast.error("Vẫn chưa thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    }
  } finally {
    isRetrying.value = false;
  }
}

async function goToLogin(): Promise<void> {
  await router.replace({ name: "admin-login" });
}
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-muted/30 px-4 py-10 text-foreground">
    <Card class="w-full max-w-lg rounded-2xl shadow-sm">
      <CardHeader class="space-y-4">
        <div class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ServerOff class="size-6" aria-hidden="true" />
        </div>
        <div class="space-y-2">
          <CardTitle class="text-2xl">Không thể kiểm tra phiên đăng nhập</CardTitle>
          <CardDescription class="leading-6">
            Không thể kiểm tra trạng thái đăng nhập lúc này.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p class="text-sm leading-6 text-muted-foreground">
          Máy chủ có thể đang tạm ngưng hoặc kết nối mạng chưa ổn định. Bạn có thể thử lại mà không làm mất trạng thái hiện tại.
        </p>
      </CardContent>
      <CardFooter class="flex flex-wrap gap-3">
        <Button :disabled="isRetrying" @click="retry">
          <RefreshCw :class="['size-4', { 'animate-spin': isRetrying }]" aria-hidden="true" />
          {{ isRetrying ? "Đang thử lại..." : "Thử lại" }}
        </Button>
        <Button variant="outline" :disabled="isRetrying" @click="goToLogin">
          Về trang đăng nhập
        </Button>
      </CardFooter>
    </Card>
  </main>
</template>
