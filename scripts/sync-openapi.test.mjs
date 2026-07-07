import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeOpenApiPaths, syncOpenApi } from './sync-openapi.mjs'

const REQUIRED_PATHS = [
  '/auth/login',
  '/auth/me',
  '/auth/csrf-token',
  '/users',
  '/branches',
  '/staff',
]

function createDocument(paths) {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Bookora API',
      version: '1.0',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API base path',
      },
    ],
    paths,
    components: {
      securitySchemes: {
        accessToken: { type: 'apiKey', in: 'cookie', name: 'accessToken' },
        refreshToken: { type: 'apiKey', in: 'cookie', name: 'refreshToken' },
        csrfCookie: { type: 'apiKey', in: 'cookie', name: 'csrfToken' },
        csrfHeader: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
      },
      schemas: {
        HealthResponseDto: { type: 'object' },
      },
    },
  }
}

function pathItem(summary = 'ok') {
  return {
    get: {
      summary,
      responses: {
        200: {
          description: 'OK',
        },
      },
    },
  }
}

function canonicalPaths(extra = {}) {
  return Object.fromEntries([
    ['/health', pathItem('health')],
    ...REQUIRED_PATHS.map((path) => [path, pathItem(path)]),
    ...Object.entries(extra),
  ])
}

function prefixedPaths(extra = {}) {
  return Object.fromEntries(
    Object.entries(canonicalPaths(extra)).map(([path, item]) => [`/api/v1${path}`, item]),
  )
}

function createFetch(document) {
  return async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify(document),
  })
}

describe('sync-openapi path normalization', () => {
  it('keeps canonical paths unchanged', () => {
    const document = createDocument(canonicalPaths())
    const normalized = normalizeOpenApiPaths(document)

    expect(Object.keys(normalized.paths)).toContain('/auth/login')
    expect(Object.keys(normalized.paths)).not.toContain('/api/v1/auth/login')
    expect(normalized).toBe(document)
  })

  it('strips exactly one matching server prefix from prefixed docs-json paths', () => {
    const document = createDocument(prefixedPaths())
    const normalized = normalizeOpenApiPaths(document)

    expect(normalized.servers[0].url).toBe('/api/v1')
    expect(Object.keys(normalized.paths)).toContain('/auth/login')
    expect(Object.keys(normalized.paths)).toContain('/health')
    expect(Object.keys(normalized.paths)).not.toContain('/api/v1/auth/login')
  })

  it('rejects mixed prefixed and unprefixed path conventions', () => {
    const document = createDocument({
      '/api/v1/health': pathItem('health'),
      '/auth/login': pathItem('login'),
      '/api/v1/auth/me': pathItem('me'),
    })

    expect(() => normalizeOpenApiPaths(document)).toThrow(/mixed/)
  })

  it('rejects duplicate paths after stripping the server prefix', () => {
    const document = createDocument({
      '/api/v1/auth/login': pathItem('prefixed login'),
      '/auth/login': pathItem('canonical login'),
    })

    expect(() => normalizeOpenApiPaths(document)).toThrow(/duplicate path: \/auth\/login/)
  })

  it('does not overwrite the artifact when validation fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bookora-openapi-'))
    const destination = join(directory, 'bookora.openapi.json')
    await writeFile(destination, '{"old":true}\n', 'utf8')

    try {
      await expect(syncOpenApi({
        destination,
        fetchImpl: createFetch(createDocument({ '/api/v1/health': pathItem('health') })),
        openApiUrl: 'http://localhost:8000/api/docs-json',
      })).rejects.toThrow(/Required OpenAPI path is missing/)

      await expect(readFile(destination, 'utf8')).resolves.toBe('{"old":true}\n')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('keeps generated endpoint paths relative so runtime URLs are not double-prefixed', () => {
    const document = createDocument(prefixedPaths())
    const normalized = normalizeOpenApiPaths(document)
    const runtimeBaseUrl = 'http://localhost:8000/api/v1'
    const generatedPath = Object.keys(normalized.paths).find((path) => path === '/health')

    expect(generatedPath).toBe('/health')
    expect(`${runtimeBaseUrl}${generatedPath}`).toBe('http://localhost:8000/api/v1/health')
    expect(`${runtimeBaseUrl}${generatedPath}`).not.toContain('/api/v1/api/v1/')
  })
})

