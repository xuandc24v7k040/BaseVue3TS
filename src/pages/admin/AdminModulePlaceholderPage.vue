<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminPagePlaceholder from '@/components/AdminPagePlaceholder.vue'
import { useAuthStore } from '@/stores/auth.store'

const route = useRoute()
const authStore = useAuthStore()
const title = computed(() => route.meta.pageTitle ?? 'Chức năng quản trị')
const description = computed(() => route.meta.pageDescription ?? 'Chức năng đang được chuẩn bị.')
const scope = computed(() => authStore.user?.type === 'BRANCH' ? 'branch-admin' : 'super-admin')
</script>

<template>
  <AdminPagePlaceholder
    :title="title"
    :description="description"
    :scope="scope"
  />
</template>
