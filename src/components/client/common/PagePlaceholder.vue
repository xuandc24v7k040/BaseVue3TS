<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

withDefaults(
  defineProps<{
    title: string
    description: string
    section?: string
    layout?: string
  }>(),
  {
    section: 'Khu vực khách hàng',
    layout: 'ClientLayout',
  },
)
</script>

<template>
  <Card class="w-full border-border shadow-sm">
    <CardHeader class="gap-4">
      <Badge variant="secondary">{{ section }}</Badge>
      <div class="space-y-2">
        <CardTitle class="text-2xl tracking-tight sm:text-3xl">
          {{ title }}
        </CardTitle>
        <CardDescription class="max-w-2xl text-sm leading-6 sm:text-base">
          {{ description }}
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <Separator />
      <dl class="grid gap-1 text-sm sm:grid-cols-[8rem_1fr] sm:gap-3">
        <dt class="font-medium text-foreground">Layout sử dụng</dt>
        <dd class="text-muted-foreground">{{ layout }}</dd>
      </dl>
      <p class="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        Giao diện và dữ liệu sẽ được triển khai ở phase sau.
      </p>
    </CardContent>
  </Card>
</template>
