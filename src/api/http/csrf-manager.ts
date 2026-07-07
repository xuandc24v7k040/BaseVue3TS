let csrfToken: string | null = null
let csrfTokenRequest: Promise<string> | null = null
let fetchCsrfToken: (() => Promise<string>) | null = null

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

    csrfTokenRequest = fetchCsrfToken()
      .then((nextToken) => {
        csrfToken = nextToken
        return nextToken
      })
      .finally(() => {
        csrfTokenRequest = null
      })
  }

  return csrfTokenRequest
}

export function clearCsrfToken(): void {
  csrfToken = null
  csrfTokenRequest = null
}

export function getCachedCsrfTokenForTest(): string | null {
  return csrfToken
}

