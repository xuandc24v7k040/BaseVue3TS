import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthMeResponseDto, LoginDto } from '@/api/generated/models'
import {
  fetchCurrentUser,
  loginWithPassword,
  logoutCurrentAccount,
} from '@/api/modules/auth.api'
import type { FetchCurrentUserOptions } from '@/api/modules/auth.api'
import { clearSessionHint, setSessionHint } from '@/features/auth/session-hint'
import { useBranchStore } from '@/stores/branch.store'
import type { AdminRole, BranchId } from '@/types/auth.type'

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated'

export interface AuthState {
  status: AuthStatus
  user: AuthMeResponseDto | null
  isBootstrapping: boolean
  bootstrapError: unknown | null
}

export type LogoutResult =
  | { confirmed: true }
  | { confirmed: false; error: unknown }

let bootstrapPromise: Promise<void> | null = null

function isFinalUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

function legacyRole(user: AuthMeResponseDto | null): AdminRole | null {
  if (!user) return null
  if (user.isSuperAdmin) return 'SUPER_ADMIN'
  return user.type === 'BRANCH' ? 'BRANCH_ADMIN' : null
}

function legacyBranchId(user: AuthMeResponseDto | null): BranchId | null {
  const branchCode = user?.branches.find((branch) => branch.id === user.primaryBranchId)?.code
  return branchCode === 'can-tho' || branchCode === 'hau-giang' ? branchCode : null
}

export const useAuthStore = defineStore('auth', () => {
  const branchStore = useBranchStore()
  const status = ref<AuthStatus>('unknown')
  const user = ref<AuthMeResponseDto | null>(null)
  const isBootstrapping = ref(false)
  const bootstrapError = ref<unknown | null>(null)
  const isLogoutNavigationPending = ref(false)

  const isAuthenticated = computed(() => status.value === 'authenticated')

  // Temporary compatibility for the existing admin shell. Prompt 2 can replace
  // these role-based assumptions with the final router and permission policy.
  const role = computed(() => legacyRole(user.value))
  const email = computed(() => user.value?.email ?? '')
  const name = computed(() => user.value?.fullName ?? '')
  const branchId = computed(() => legacyBranchId(user.value))
  const branchName = computed(() => {
    return user.value?.branches.find((branch) => branch.id === user.value?.primaryBranchId)?.name ?? null
  })
  const loginError = computed<string | null>(() => null)

  function setAuthenticated(nextUser: AuthMeResponseDto): void {
    user.value = nextUser
    branchStore.initialize(nextUser)
    status.value = 'authenticated'
    bootstrapError.value = null
  }

  function setAnonymous(): void {
    user.value = null
    branchStore.reset()
    status.value = 'anonymous'
    bootstrapError.value = null
    isBootstrapping.value = false
  }

  function markSessionExpired(): void {
    clearSessionHint()
    setAnonymous()
  }

  function completeLogoutNavigation(): void {
    isLogoutNavigationPending.value = false
  }

  async function refreshCurrentUser(
    options?: FetchCurrentUserOptions,
  ): Promise<AuthMeResponseDto> {
    const currentUser = await fetchCurrentUser(options)
    setAuthenticated(currentUser)
    return currentUser
  }

  async function runBootstrap(options?: FetchCurrentUserOptions): Promise<void> {
    isBootstrapping.value = true
    bootstrapError.value = null

    try {
      await refreshCurrentUser(options)
    } catch (error: unknown) {
      user.value = null
      branchStore.reset()

      if (isFinalUnauthorized(error)) {
        clearSessionHint()
        status.value = 'anonymous'
        bootstrapError.value = null
      } else {
        status.value = 'unknown'
        bootstrapError.value = error
      }
    } finally {
      isBootstrapping.value = false
    }
  }

  function bootstrap(options?: FetchCurrentUserOptions): Promise<void> {
    if (!bootstrapPromise) {
      bootstrapPromise = runBootstrap(options).finally(() => {
        bootstrapPromise = null
      })
    }
    return bootstrapPromise
  }

  function ensureBootstrapped(): Promise<void> {
    if (status.value !== 'unknown' && !bootstrapError.value) {
      return Promise.resolve()
    }
    return bootstrap()
  }

  async function retryBootstrap(): Promise<void> {
    bootstrapError.value = null
    if (status.value !== 'authenticated') status.value = 'unknown'
    await bootstrap()
  }

  async function login(payload: LoginDto): Promise<AuthMeResponseDto> {
    await loginWithPassword(payload)

    try {
      const currentUser = await refreshCurrentUser()
      setSessionHint()
      return currentUser
    } catch (error: unknown) {
      user.value = null
      branchStore.reset()

      if (isFinalUnauthorized(error)) {
        status.value = 'anonymous'
        bootstrapError.value = null
      } else {
        status.value = 'unknown'
        bootstrapError.value = error
      }

      throw error
    }
  }

  async function logout(): Promise<LogoutResult> {
    try {
      await logoutCurrentAccount()
      clearSessionHint()
      isLogoutNavigationPending.value = true
      setAnonymous()
      return { confirmed: true }
    } catch (error: unknown) {
      return { confirmed: false, error }
    }
  }

  return {
    status,
    user,
    isBootstrapping,
    bootstrapError,
    isLogoutNavigationPending,
    isAuthenticated,
    role,
    email,
    name,
    branchId,
    branchName,
    loginError,
    ensureBootstrapped,
    bootstrap,
    refreshCurrentUser,
    login,
    logout,
    completeLogoutNavigation,
    markSessionExpired,
    setAnonymous,
    retryBootstrap,
  }
})
