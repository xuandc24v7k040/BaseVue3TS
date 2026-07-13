<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { env } from "@/lib/env";

interface TurnstileRenderOptions {
  sitekey: string;
  theme: "light" | "dark" | "auto";
  size: "normal" | "compact" | "flexible";
  action?: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const COMPACT_WIDGET_MEDIA_QUERY = "(max-width: 431px)";

let turnstileScriptPromise: Promise<void> | null = null;

const props = withDefaults(
  defineProps<{
    siteKey?: string;
    disabled?: boolean;
    action?: string;
  }>(),
  {
    siteKey: undefined,
    disabled: false,
    action: undefined,
  },
);

const emit = defineEmits<{
  verified: [token: string];
  expired: [];
  error: [];
}>();

defineExpose({
  reset,
});

const widgetTargetRef = ref<HTMLElement | null>(null);
const widgetId = ref<string | null>(null);
const widgetSize = ref<TurnstileRenderOptions["size"]>("flexible");
let compactWidgetMediaQuery: MediaQueryList | null = null;

const resolvedSiteKey = computed(() => props.siteKey ?? env.turnstileSiteKey);
const shouldRender = computed(
  () =>
    env.turnstileEnabled && !props.disabled && resolvedSiteKey.value.length > 0,
);

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      TURNSTILE_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Turnstile")),
        {
          once: true,
        },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load Turnstile")),
      {
        once: true,
      },
    );

    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

function syncWidgetSize(): void {
  widgetSize.value = compactWidgetMediaQuery?.matches ? "compact" : "flexible";
}

async function renderWidget(): Promise<void> {
  if (!env.turnstileEnabled) {
    emit("verified", "");
    return;
  }

  if (!shouldRender.value || widgetId.value) {
    return;
  }

  await nextTick();

  if (!widgetTargetRef.value) {
    return;
  }

  try {
    await loadTurnstileScript();

    if (
      !window.turnstile ||
      !widgetTargetRef.value ||
      !shouldRender.value ||
      widgetId.value
    ) {
      return;
    }

    widgetId.value = window.turnstile.render(widgetTargetRef.value, {
      sitekey: resolvedSiteKey.value,
      theme: "light",
      size: widgetSize.value,
      action: props.action,
      callback: (token) => emit("verified", token),
      "expired-callback": () => {
        emit("expired");
      },
      "error-callback": () => {
        emit("error");
      },
    });
  } catch {
    emit("error");
  }
}

function reset(): void {
  if (widgetId.value) {
    window.turnstile?.reset(widgetId.value);
  }
}

function removeWidget(): void {
  if (!widgetId.value) {
    return;
  }

  window.turnstile?.remove(widgetId.value);
  widgetId.value = null;
}

onMounted(() => {
  compactWidgetMediaQuery = window.matchMedia(COMPACT_WIDGET_MEDIA_QUERY);
  syncWidgetSize();
  compactWidgetMediaQuery.addEventListener("change", syncWidgetSize);

  void renderWidget();
});

watch(widgetSize, () => {
  if (!env.turnstileEnabled) {
    return;
  }

  removeWidget();
  void renderWidget();
});

watch(shouldRender, (enabled) => {
  if (enabled) {
    void renderWidget();
    return;
  }

  removeWidget();

  if (!env.turnstileEnabled) {
    emit("verified", "");
  }
});

onBeforeUnmount(() => {
  compactWidgetMediaQuery?.removeEventListener("change", syncWidgetSize);
  removeWidget();
});
</script>

<template>
  <div
    v-if="env.turnstileEnabled"
    class="turnstile-widget flex min-h-[65px] w-full items-center justify-center overflow-hidden bg-transparent"
  >
    <div ref="widgetTargetRef" class="turnstile-widget__target" />
  </div>
</template>

<style scoped>
.turnstile-widget {
  margin-inline: auto;
}

@media (min-width: 432px) {
  .turnstile-widget {
    margin-inline: 0;
  }

  .turnstile-widget__target,
  .turnstile-widget__target :deep(iframe) {
    width: 100% !important;
    max-width: 100%;
  }
}

@media (max-width: 431px) {
  .turnstile-widget__target {
    width: fit-content;
    max-width: 100%;
  }
}
</style>
