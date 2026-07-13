<script setup lang="ts">
import AuthVisualPanel from "@/components/client/auth/AuthVisualPanel.vue";
import CustomerLoginForm from "@/components/client/auth/CustomerLoginForm.vue";
import CustomerAuthSessionSkeleton from "@/components/client/auth/CustomerAuthSessionSkeleton.vue";
import { useCustomerAuthPage } from "@/composables/use-customer-auth-page";

const { isCheckingSession } = useCustomerAuthPage();
</script>

<template>
  <CustomerAuthSessionSkeleton v-if="isCheckingSession" />
  <div
    v-else
    class="grid w-full md:h-[clamp(650px,calc(100dvh-48px),680px)] md:grid-cols-[42fr_58fr]"
  >
    <AuthVisualPanel variant="login" />
    <CustomerLoginForm />
  </div>
</template>
