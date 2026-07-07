import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipCsrf?: boolean
    skipAuthRefresh?: boolean
    retryAttempted?: boolean
  }
}

