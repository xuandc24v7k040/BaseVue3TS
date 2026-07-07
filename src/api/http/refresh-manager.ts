let refreshRequest: (() => Promise<void>) | null = null
let refreshSessionRequest: Promise<void> | null = null
let onRefreshFailure: ((error: unknown) => void) | null = null

export function configureRefreshSession(options: {
  request: () => Promise<void>
  onFailure?: (error: unknown) => void
}): void {
  refreshRequest = options.request
  onRefreshFailure = options.onFailure ?? null
}

export async function refreshSession(): Promise<void> {
  if (!refreshSessionRequest) {
    if (!refreshRequest) {
      throw new Error('Refresh session request has not been configured.')
    }

    refreshSessionRequest = refreshRequest()
      .catch((error: unknown) => {
        onRefreshFailure?.(error)
        throw error
      })
      .finally(() => {
        refreshSessionRequest = null
      })
  }

  return refreshSessionRequest
}

export function resetRefreshSessionForTest(): void {
  refreshSessionRequest = null
}

