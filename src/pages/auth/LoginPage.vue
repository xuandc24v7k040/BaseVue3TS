<script setup lang="ts">
import {
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardList,
} from "@lucide/vue";
import logoUrl from "@/assets/logo.png";
import { Card, CardContent } from "@/components/ui/card";
import LoginForm from "@/pages/auth/components/LoginForm.vue";

const highlights = [
  "Quản lý chi nhánh Cần Thơ và Hậu Giang",
  "Theo dõi đơn hàng và tồn kho theo thời gian thực",
  "Báo cáo doanh thu và hiệu quả bán hàng",
];

const demoStats = [
  { label: "2 chi nhánh", icon: Building2 },
  { label: "316 đơn hàng mới", icon: ClipboardList },
  { label: "128M doanh thu demo", icon: ChartNoAxesCombined },
];
</script>

<template>
  <div
    class="grid min-h-svh overflow-hidden bg-background lg:h-svh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
  >
    <section class="flex min-h-0 flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div class="flex items-center font-semibold">
        <span class="text-lg">Bookora</span>
      </div>

      <div class="flex min-h-0 flex-1 items-center justify-center">
        <Card class="w-full max-w-md rounded-3xl border-border/70 shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </section>

    <section
      class="hidden min-h-0 items-center overflow-hidden bg-gradient-to-br from-blue-50 via-slate-50 to-white p-8 lg:flex"
    >
      <div class="mx-auto w-full max-w-2xl space-y-6">
        <div class="space-y-3">
          <div class="flex items-center">
            <img
              :src="logoUrl"
              alt="Bookora"
              class="h-16 w-16 object-contain"
            />
            <p
              class="text-sm font-medium uppercase tracking-wide text-blue-700"
            >
              Bookora
            </p>
          </div>
          <div class="space-y-3">
            <h2
              class="text-3xl font-semibold tracking-tight text-slate-950 xl:text-4xl"
            >
              Bookora Admin
            </h2>
            <p class="text-lg font-medium text-slate-700">
              Quản trị nhà sách đa chi nhánh
            </p>
          </div>
          <p class="max-w-xl text-sm leading-6 text-slate-600">
            Theo dõi đơn hàng, tồn kho, chi nhánh, sản phẩm và báo cáo vận hành
            trong một không gian quản trị tập trung.
          </p>
        </div>

        <div class="grid gap-3">
          <div
            v-for="highlight in highlights"
            :key="highlight"
            class="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
          >
            <CheckCircle2 class="h-5 w-5 text-blue-600" />
            {{ highlight }}
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <Card
            v-for="stat in demoStats"
            :key="stat.label"
            class="rounded-2xl border-white/80 bg-white/75 shadow-sm"
          >
            <CardContent class="space-y-3 p-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"
              >
                <component :is="stat.icon" class="h-5 w-5" />
              </div>
              <p class="text-sm font-semibold text-slate-900">
                {{ stat.label }}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  </div>
</template>
