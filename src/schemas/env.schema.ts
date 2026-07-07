import { z } from 'zod'

export const envSchema = z
  .object({
    VITE_API_URL: z.string().url().default('http://localhost:8000'),
    VITE_API_BASE_URL: z.string().url().optional(),
    VITE_TURNSTILE_ENABLED: z.string().default('false'),
    VITE_TURNSTILE_SITE_KEY: z.string().default(''),
  })
  .transform((env) => ({
    ...env,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL ?? `${env.VITE_API_URL}/api/v1`,
  }))
