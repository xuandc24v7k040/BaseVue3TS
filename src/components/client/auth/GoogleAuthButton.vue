<script setup lang="ts">
import googleLogo from '@/assets/client/auth/google-logo.svg'
import { Button } from '@/components/ui/button'

withDefaults(defineProps<{
  label: string
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <Button type="button" variant="outline" class="h-11 w-full rounded-lg border-[var(--bookora-auth-border)] bg-white font-medium hover:bg-[var(--bookora-auth-cream)]" :disabled="disabled" @click="emit('click')">
    <img :src="googleLogo" alt="" class="size-4" />
    {{ label }}
  </Button>
</template>
