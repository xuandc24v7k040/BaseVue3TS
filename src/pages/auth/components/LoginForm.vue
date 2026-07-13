<script setup lang="ts">
import { LoaderCircle } from "@lucide/vue";
import { useQueryClient } from "@tanstack/vue-query";
import type { HTMLAttributes } from "vue";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { AuthLoginBody } from "@/api/generated/zod/auth/auth";
import { toBookoraApiError } from "@/api/http/errors";
import { clearCsrfToken } from "@/api/http/csrf-manager";
import { syncAuthMeQuery } from "@/api/query-cache";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { dashboardRouteForUserType, safeRedirectForUser } from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();
const branchStore = useBranchStore();

const email = ref("");
const password = ref("");
const turnstileToken = ref("");
const turnstileError = ref<string | null>(null);
const submitError = ref<string | null>(null);
const isSubmitting = ref(false);
const fieldErrors = reactive<Record<"email" | "password", string | null>>({
  email: null,
  password: null,
});
const turnstileWidget = ref<InstanceType<typeof TurnstileWidget> | null>(null);
const hasTurnstileConfigurationError = computed(
  () => env.turnstileEnabled && env.turnstileSiteKey.length === 0,
);

watch(email, () => {
  fieldErrors.email = null;
  submitError.value = null;
});

watch(password, () => {
  fieldErrors.password = null;
  submitError.value = null;
});

function resetTurnstile(): void {
  if (!env.turnstileEnabled) return;
  turnstileToken.value = "";
  turnstileWidget.value?.reset();
}

function handleTurnstileVerified(token: string): void {
  turnstileToken.value = token;
  turnstileError.value = null;
}

function handleTurnstileExpired(): void {
  turnstileToken.value = "";
  turnstileError.value = "Phiên xác minh đã hết hạn. Vui lòng xác minh lại.";
}

function handleTurnstileError(): void {
  turnstileToken.value = "";
  turnstileError.value = "Xác minh bảo mật thất bại, vui lòng thử lại.";
  toast.error(turnstileError.value);
}

function resetErrors(): void {
  fieldErrors.email = null;
  fieldErrors.password = null;
  turnstileError.value = null;
  submitError.value = null;
}

function setLoginError(error: unknown): void {
  const apiError = toBookoraApiError(error);
  const status = apiError.statusCode;

  if (!status || status >= 500) {
    submitError.value =
      "Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend hoặc thử lại sau.";
  } else if (status === 401) {
    submitError.value = "Email hoặc mật khẩu không chính xác.";
  } else if (status === 429) {
    submitError.value =
      "Có quá nhiều yêu cầu đăng nhập hoặc tài khoản đang tạm khóa. Vui lòng thử lại sau.";
  } else if (apiError.code === "TURNSTILE_REQUIRED") {
    turnstileError.value = "Vui lòng hoàn tất xác minh bảo mật.";
  } else if (apiError.code === "TURNSTILE_FAILED") {
    turnstileError.value = "Xác minh bảo mật thất bại, vui lòng thử lại.";
  } else if (apiError.code === "CSRF_INVALID") {
    clearCsrfToken();
    submitError.value = "Phiên bảo mật không hợp lệ, vui lòng thử lại.";
  } else if (status === 400 && apiError.errors?.length) {
    submitError.value = apiError.errors.join(" ");
  } else {
    submitError.value = apiError.message || "Đăng nhập thất bại. Vui lòng thử lại.";
  }

  const message = turnstileError.value ?? submitError.value;
  if (message) toast.error(message);
}

async function login(): Promise<void> {
  if (isSubmitting.value) return;
  resetErrors();

  if (hasTurnstileConfigurationError.value) {
    turnstileError.value =
      "Thiếu cấu hình VITE_TURNSTILE_SITE_KEY. Không thể đăng nhập.";
    toast.error(turnstileError.value);
    return;
  }

  const validation = AuthLoginBody.safeParse({
    email: email.value,
    password: password.value,
    ...(env.turnstileEnabled ? { turnstileToken: turnstileToken.value } : {}),
  });

  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const field = issue.path[0];
      if (field === "email" && !fieldErrors.email) {
        fieldErrors.email = "Vui lòng nhập email hợp lệ.";
      }
      if (field === "password" && !fieldErrors.password) {
        fieldErrors.password =
          "Mật khẩu cần ít nhất 8 ký tự, gồm chữ cái và chữ số.";
      }
    }
    return;
  }

  if (env.turnstileEnabled && !turnstileToken.value) {
    turnstileError.value = "Vui lòng hoàn tất xác minh bảo mật.";
    toast.error(turnstileError.value);
    return;
  }

  isSubmitting.value = true;

  try {
    const user = await authStore.login(validation.data);
    syncAuthMeQuery(queryClient, user);

    if (user.type === "SYSTEM") {
      branchStore.setManagementScope("all");
    } else if (user.type === "BRANCH") {
      branchStore.applyAuthContext(authStore.role, authStore.branchId);
    }

    await router.replace(
      safeRedirectForUser(router, route.query.redirect, user.type) ??
        dashboardRouteForUserType(user.type),
    );
  } catch (error: unknown) {
    setLoginError(error);
    resetTurnstile();
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <form :class="cn('flex flex-col gap-5', props.class)" novalidate @submit.prevent="login">
    <FieldGroup>
      <div class="space-y-1.5">
        <h1 class="text-2xl font-semibold tracking-tight">Đăng nhập quản trị</h1>
        <p class="text-sm leading-5 text-muted-foreground">
          Dùng tài khoản Bookora để truy cập khu vực quản trị phù hợp.
        </p>
      </div>

      <p v-if="submitError" role="alert" class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ submitError }}
      </p>

      <Field>
        <FieldLabel for="email">Email</FieldLabel>
        <Input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="admin@bookora.vn"
          class="bg-background dark:bg-background"
          :aria-invalid="Boolean(fieldErrors.email)"
          :disabled="isSubmitting"
        />
        <FieldError :errors="[fieldErrors.email ?? undefined]" />
      </Field>

      <Field>
        <FieldLabel for="password">Mật khẩu</FieldLabel>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Nhập mật khẩu"
          class="bg-background dark:bg-background"
          :aria-invalid="Boolean(fieldErrors.password)"
          :disabled="isSubmitting"
        />
        <FieldError :errors="[fieldErrors.password ?? undefined]" />
      </Field>

      <TurnstileWidget
        ref="turnstileWidget"
        action="login"
        :disabled="hasTurnstileConfigurationError || isSubmitting"
        @verified="handleTurnstileVerified"
        @expired="handleTurnstileExpired"
        @error="handleTurnstileError"
      />

      <p v-if="turnstileError" role="alert" class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ turnstileError }}
      </p>
      <Field>
        <Button
          type="submit"
          class="w-full rounded-xl"
          :disabled="isSubmitting || hasTurnstileConfigurationError"
        >
          <LoaderCircle v-if="isSubmitting" class="size-4 animate-spin" />
          {{ isSubmitting ? "Đang đăng nhập..." : "Đăng nhập" }}
        </Button>
      </Field>
    </FieldGroup>
  </form>
</template>
