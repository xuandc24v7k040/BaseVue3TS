import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
} from '@/api/generated/endpoints/auth/auth'
import type {
  AuthMeResponseDto,
  AuthMutationResponseDto,
  LoginDto,
  PublicAuthUserResponseDto,
  RegisterDto,
} from '@/api/generated/models'
import type { AxiosRequestConfig } from 'axios'
import { getCsrfToken } from '@/api/http/csrf-manager'

export type FetchCurrentUserOptions = Pick<
  AxiosRequestConfig,
  'skipAuthRefresh'
>

export async function loginWithPassword(
  payload: LoginDto,
): Promise<PublicAuthUserResponseDto> {
  await getCsrfToken()
  const response = await authLogin(payload)
  return response.data
}

export async function registerCustomer(
  payload: RegisterDto,
): Promise<PublicAuthUserResponseDto> {
  await getCsrfToken()
  const response = await authRegister(payload)
  return response.data
}

export async function fetchCurrentUser(
  options?: FetchCurrentUserOptions,
): Promise<AuthMeResponseDto> {
  const response = await authMe(options)
  return response.data
}

export async function logoutCurrentAccount(): Promise<AuthMutationResponseDto> {
  const response = await authLogout()
  return response.data
}

export const authApi = {
  loginWithPassword,
  registerCustomer,
  fetchCurrentUser,
  logoutCurrentAccount,
}
