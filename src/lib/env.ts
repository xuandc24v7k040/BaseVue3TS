import { envSchema } from '@/schemas/env.schema'

const parsedEnv = envSchema.parse(import.meta.env)

const turnstileEnabled = parsedEnv.VITE_TURNSTILE_ENABLED === 'true'

if (import.meta.env.DEV && turnstileEnabled && !parsedEnv.VITE_TURNSTILE_SITE_KEY) {
  console.warn('VITE_TURNSTILE_SITE_KEY is required when Turnstile is enabled.')
}

export const env = {
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL,
  turnstileEnabled,
  turnstileSiteKey: parsedEnv.VITE_TURNSTILE_SITE_KEY,
  vietMapTilemapKey: parsedEnv.VITE_VIETMAP_TILEMAP_KEY,
} as const
