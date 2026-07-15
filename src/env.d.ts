/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_TURNSTILE_ENABLED?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
  readonly VITE_VIETMAP_TILEMAP_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
