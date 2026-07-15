<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useBranchStore } from '@/stores/branch.store'

const route = useRoute()
const router = useRouter()
const branchStore = useBranchStore()

const canContinue = computed(() => branchStore.selectedBranchId !== null)
const hasAssignments = computed(() => branchStore.availableBranches.length > 0)

async function continueToRequestedRoute(): Promise<void> {
  if (!canContinue.value) return
  const redirect = typeof route.query.redirect === 'string'
    && route.query.redirect.startsWith('/')
    && !route.query.redirect.startsWith('//')
    ? route.query.redirect
    : '/branch-admin/dashboard'
  await router.replace(redirect)
}
</script>

<template>
  <Card class="mx-auto w-full max-w-xl rounded-2xl">
    <CardHeader>
      <div class="mb-2 flex size-11 items-center justify-center rounded-xl bg-muted">
        <Building2 class="size-5 text-muted-foreground" />
      </div>
      <CardTitle>Yêu cầu chọn chi nhánh</CardTitle>
      <CardDescription v-if="hasAssignments">
        Chọn một chi nhánh từ bộ chọn trên thanh tiêu đề trước khi tiếp tục.
      </CardDescription>
      <CardDescription v-else>
        Tài khoản của bạn chưa được phân công chi nhánh đang hoạt động.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button v-if="hasAssignments" :disabled="!canContinue" @click="continueToRequestedRoute">
        Tiếp tục với {{ branchStore.scopeLabel }}
      </Button>
      <p v-else class="text-sm text-muted-foreground">
        Phiên đăng nhập vẫn được giữ nguyên. Vui lòng liên hệ quản trị hệ thống để được phân công.
      </p>
    </CardContent>
  </Card>
</template>
