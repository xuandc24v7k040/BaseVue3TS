import axios from 'axios'
import type { ErrorResponseDto } from '@/api/generated/models'
import type { UserFormState } from '../types'

export const USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH_MESSAGE =
  'Không thể kích hoạt tài khoản. Người dùng nội bộ cần có ít nhất một phân công đang hoạt động tại chi nhánh đang hoạt động và có đúng một chi nhánh chính.'

export function userBusinessErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return fallback
  const response = error.response
  if (response?.data.code === 'USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH') {
    return USER_ACTIVATION_REQUIRES_ACTIVE_BRANCH_MESSAGE
  }
  if (response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (response?.status === 404) return 'Không tìm thấy người dùng.'
  if (response?.status === 409) {
    return 'Không thể thực hiện thao tác do ràng buộc dữ liệu tài khoản.'
  }
  return response?.data.message || fallback
}

export function applyUserServerFieldErrors(
  error: unknown,
  errors: Partial<Record<keyof UserFormState, string>>,
): void {
  if (!axios.isAxiosError<ErrorResponseDto>(error)) return
  const response = error.response
  if (response?.status === 409) errors.email = 'Email đã được sử dụng.'
  const fieldErrors = response?.data.errors
  if (!fieldErrors) return
  const labels: Record<keyof UserFormState, string> = {
    fullName: 'Họ và tên không hợp lệ.',
    email: 'Email không hợp lệ.',
    phone: 'Số điện thoại không hợp lệ.',
    gender: 'Giới tính không hợp lệ.',
    birthday: 'Ngày sinh không hợp lệ.',
  }
  Object.keys(fieldErrors).forEach((field) => {
    if (field in labels) errors[field as keyof UserFormState] = labels[field as keyof UserFormState]
  })
}
