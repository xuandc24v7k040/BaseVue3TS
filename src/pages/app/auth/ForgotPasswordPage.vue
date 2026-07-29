<script setup lang="ts">
import AuthVisualPanel from "@/components/client/auth/AuthVisualPanel.vue";
import ForgotPasswordForm from "@/features/password-recovery/components/ForgotPasswordForm.vue";
</script>

<template>
  <div
    class="grid w-full md:min-h-[clamp(650px,calc(100dvh-48px),720px)] md:grid-cols-[42fr_58fr]"
  >
    <AuthVisualPanel variant="login" />
    <ForgotPasswordForm />
  </div>
</template>
