<script setup lang="ts">
import {
  CheckCircle2,
} from "@lucide/vue";
import axios from "axios";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import logoUrl from "@/assets/logo.png";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LoginForm from "@/pages/auth/components/LoginForm.vue";
import {
  clearSessionHint,
  hasSessionHint,
} from "@/features/auth/session-hint";
import { resolveAdminPostAuthRoute } from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const isCheckingSession = ref(
  authStore.status === "authenticated" ||
    (authStore.status === "unknown" && hasSessionHint()),
);
let hasStartedSessionCheck = false;

async function checkExistingSession(): Promise<void> {
  if (hasStartedSessionCheck) return;
  hasStartedSessionCheck = true;

  try {
    if (authStore.status === "unknown" && hasSessionHint()) {
      await authStore.refreshCurrentUser({ skipAuthRefresh: true });
    }

    if (
      route.name === "admin-login" &&
      authStore.status === "authenticated" &&
      authStore.user
    ) {
      await router.replace(
        resolveAdminPostAuthRoute(
          router,
          route.query.redirect,
          authStore.user,
          branchStore,
        ),
      );
    }
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearSessionHint();
    }
  } finally {
    if (route.name === "admin-login") {
      isCheckingSession.value = false;
    }
  }
}

onMounted(() => {
  void checkExistingSession();
});

const highlights = [
  "Quản lý vận hành đa chi nhánh",
  "Theo dõi đơn hàng và tồn kho tập trung",
  "Phân tích doanh thu theo phạm vi được cấp quyền",
];
</script>

<template>
  <div
    class="grid min-h-svh overflow-hidden bg-background lg:h-svh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
  >
    <section class="flex min-h-0 flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div class="flex items-center font-semibold">
        <span class="text-lg">Bookora</span>
      </div>

      <div class="flex min-h-0 flex-1 items-center justify-center">
        <Card class="w-full max-w-md rounded-3xl border-border/70 shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <div
              v-if="isCheckingSession"
              class="space-y-5"
              aria-live="polite"
              aria-busy="true"
            >
              <div class="space-y-2">
                <Skeleton class="h-7 w-52" />
                <Skeleton class="h-4 w-full" />
              </div>
              <div class="space-y-3">
                <Skeleton class="h-9 w-full" />
                <Skeleton class="h-9 w-full" />
                <Skeleton class="h-9 w-full" />
              </div>
              <p class="text-center text-sm text-muted-foreground">
                Đang kiểm tra phiên đăng nhập...
              </p>
            </div>
            <LoginForm v-else />
          </CardContent>
        </Card>
      </div>
    </section>

    <section
      class="hidden min-h-0 items-center overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-white p-8 lg:flex"
    >
      <div class="mx-auto w-full max-w-2xl space-y-6">
        <div class="space-y-3">
          <div class="flex items-center">
            <img
              :src="logoUrl"
              alt="Bookora"
              class="h-16 w-16 object-contain"
            />
            <p
              class="text-sm font-medium uppercase tracking-wide text-blue-700"
            >
              Bookora
            </p>
          </div>
          <div class="space-y-3">
            <h2
              class="text-3xl font-semibold tracking-tight text-slate-950 xl:text-4xl"
            >
              Bookora Admin
            </h2>
            <p class="text-lg font-medium text-slate-700">
              Quản trị nhà sách đa chi nhánh
            </p>
          </div>
          <p class="max-w-xl text-sm leading-6 text-slate-600">
            Theo dõi đơn hàng, tồn kho, chi nhánh, sản phẩm và báo cáo vận hành
            trong một không gian quản trị tập trung.
          </p>
        </div>

        <div class="grid gap-3">
          <div
            v-for="highlight in highlights"
            :key="highlight"
            class="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
          >
            <CheckCircle2 class="h-5 w-5 text-blue-600" />
            {{ highlight }}
          </div>
        </div>

      </div>
    </section>
  </div>
</template>
