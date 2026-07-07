import { AxiosHeaders } from 'axios'
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  RawAxiosHeaders,
} from 'axios'
import { apiClient } from './http/client'

function toAxiosHeaders(headers: AxiosRequestConfig['headers']): AxiosHeaders {
  return AxiosHeaders.from(headers as AxiosHeaders | RawAxiosHeaders | undefined)
}

function mergeRequestConfig(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): AxiosRequestConfig {
  if (!options) {
    return config
  }

  return {
    ...config,
    ...options,
    headers: AxiosHeaders.concat(toAxiosHeaders(config.headers), toAxiosHeaders(options.headers)),
  }
}

export async function customInstance<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.request<T>(mergeRequestConfig(config, options))

  return response.data
}

export type ErrorType<Error> = AxiosError<Error>
export type BodyType<BodyData> = BodyData
export type ResponseType<ResponseData> = AxiosResponse<ResponseData>
