<script setup lang="ts">
import "vue-sonner/style.css";
import { Toaster } from "vue-sonner";
</script>

<template>
  <RouterView />
  <Toaster position="top-right" rich-colors close-button />
</template>
