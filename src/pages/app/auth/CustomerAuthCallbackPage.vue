<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import CustomerAuthSessionSkeleton from '@/components/client/auth/CustomerAuthSessionSkeleton.vue'
import { Button } from '@/components/ui/button'
import { syncAuthMeQuery } from '@/api/query-cache'
import { clearSessionHint, setSessionHint } from '@/features/auth/session-hint'
import { customerLandingRouteForUserType } from '@/router'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const authStore = useAuthStore()
const errorMessage = ref<string | null>(null)
const isLoading = ref(true)

async function completeCallback(): Promise<void> {
  isLoading.value = true
  errorMessage.value = null

  if (route.query.success !== 'true') {
    clearSessionHint()
    authStore.setAnonymous()
    await router.replace({
      name: 'customer-login',
      query: { error: typeof route.query.error === 'string' ? route.query.error : 'google_auth_failed' },
    })
    return
  }

  try {
    const user = await authStore.refreshCurrentUser()
    setSessionHint()
    syncAuthMeQuery(queryClient, user)
    await router.replace(customerLandingRouteForUserType(user.type))
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearSessionHint()
      authStore.setAnonymous()
      await router.replace({ name: 'customer-login', query: { error: 'google_auth_failed' } })
      return
    }

    errorMessage.value = 'Không thể tải phiên đăng nhập. Vui lòng thử lại.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void completeCallback()
})
</script>

<template>
  <CustomerAuthSessionSkeleton v-if="isLoading" />
  <section v-else class="flex min-h-[590px] items-center justify-center bg-white px-6 py-10 text-center">
    <div class="max-w-md">
      <h1 class="text-2xl font-semibold">Không thể hoàn tất đăng nhập</h1>
      <p class="mt-3 text-sm text-[var(--bookora-auth-muted)]">{{ errorMessage }}</p>
      <Button class="mt-6 bg-[var(--bookora-green)] text-white" @click="completeCallback">
        Thử lại
      </Button>
    </div>
  </section>
</template>
