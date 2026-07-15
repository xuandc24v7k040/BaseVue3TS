<script setup lang="ts">
import type { BranchLocation } from '../types'
import BranchMap from './BranchMap.vue'

defineProps<{ location: BranchLocation }>()
</script>

<template>
  <BranchMap :location="location" :interactive="false" height-class="h-64 sm:h-72 lg:h-80" />
</template>
