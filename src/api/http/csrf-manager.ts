let csrfToken: string | null = null
let csrfTokenRequest: Promise<string> | null = null
let fetchCsrfToken: (() => Promise<string>) | null = null
let csrfGeneration = 0

export function configureCsrfTokenFetcher(fetcher: () => Promise<string>): void {
  fetchCsrfToken = fetcher
}

export async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken
  }

  if (!csrfTokenRequest) {
    if (!fetchCsrfToken) {
      throw new Error('CSRF token fetcher has not been configured.')
    }

    const generationAtStart = csrfGeneration
    const request = fetchCsrfToken()
      .then((nextToken) => {
        if (generationAtStart === csrfGeneration) {
          csrfToken = nextToken
        }
        return nextToken
      })
      .finally(() => {
        if (csrfTokenRequest === request) {
          csrfTokenRequest = null
        }
      })
    csrfTokenRequest = request
  }

  return csrfTokenRequest
}

export function clearCsrfToken(): void {
  csrfGeneration += 1
  csrfToken = null
  csrfTokenRequest = null
}

export function getCachedCsrfTokenForTest(): string | null {
  return csrfToken
}
