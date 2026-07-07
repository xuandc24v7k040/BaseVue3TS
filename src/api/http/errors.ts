import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ApiError, ApiErrorBody } from '@/types/api.type'

export interface BackendErrorPayload extends ApiErrorBody {
  code?: string
  errors?: string[]
  path?: string
  method?: string
  timestamp?: string
}

export interface BookoraApiError extends ApiError {
  code?: string
  backendStatusCode?: number
  error?: string
  errors?: string[]
  path?: string
  method?: string
  timestamp?: string
  cause?: unknown
}

function getMessageFromPayload(payload: BackendErrorPayload | undefined): string | undefined {
  const message = payload?.message

  if (Array.isArray(message)) {
    return message[0]
  }

  return message
}

export function toBookoraApiError(error: unknown): BookoraApiError {
  if (axios.isAxiosError<BackendErrorPayload>(error)) {
    const payload = error.response?.data

    return {
      message: getMessageFromPayload(payload) ?? error.message,
      statusCode: error.response?.status,
      backendStatusCode: payload?.statusCode,
      error: payload?.error,
      code: payload?.code,
      errors: payload?.errors,
      path: payload?.path,
      method: payload?.method,
      timestamp: payload?.timestamp,
      details: payload,
      cause: error,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      cause: error,
    }
  }

  return {
    message: 'Yeu cau that bai',
    details: error,
    cause: error,
  }
}

export type BookoraAxiosError<T = BackendErrorPayload> = AxiosError<T>

