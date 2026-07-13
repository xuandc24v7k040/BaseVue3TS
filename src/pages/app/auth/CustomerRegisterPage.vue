<script setup lang="ts">
import AuthVisualPanel from '@/components/client/auth/AuthVisualPanel.vue'
import CustomerRegisterForm from '@/components/client/auth/CustomerRegisterForm.vue'
import CustomerAuthSessionSkeleton from '@/components/client/auth/CustomerAuthSessionSkeleton.vue'
import { useCustomerAuthPage } from '@/composables/use-customer-auth-page'

const { isCheckingSession } = useCustomerAuthPage()
</script>

<template>
  <CustomerAuthSessionSkeleton v-if="isCheckingSession" />
  <div v-else data-auth-page="register" class="grid w-full items-stretch md:min-h-[720px] md:grid-cols-[42fr_58fr] lg:min-h-[740px]">
    <AuthVisualPanel variant="register" />
    <CustomerRegisterForm />
  </div>
</template>
