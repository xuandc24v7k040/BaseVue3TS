<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Cross2Icon } from '@radix-icons/vue'
import { reactiveOmit } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import DialogOverlay from './DialogOverlay.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()
const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      data-slot="dialog-content"
      :class="cn(
        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-6 shadow-lg duration-200',
        props.class,
      )"
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />
      <DialogClose
        class="ring-offset-background focus:ring-ring absolute right-3 top-3 grid size-9 place-items-center rounded-md opacity-70 transition-[background-color,opacity] hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none"
      >
        <Cross2Icon class="size-4" />
        <span class="sr-only">Đóng</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
