import type { User } from '../types'

export function userTypeLabel(type: User['type']): string {
  return { SYSTEM: 'Hệ thống', BRANCH: 'Nội bộ chi nhánh', CUSTOMER: 'Khách hàng' }[type]
}

export function userProviderLabel(provider: User['provider']): string {
  return { LOCAL: 'Email và mật khẩu', GOOGLE: 'Google' }[provider]
}

export function userGenderLabel(gender: string | null): string {
  if (!gender) return '—'
  const normalized = gender.trim().toLowerCase()
  if (normalized === 'male' || normalized === 'nam') return 'Nam'
  if (normalized === 'female' || normalized === 'nữ' || normalized === 'nu') return 'Nữ'
  return gender
}

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatUserDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

export function formatUserBirthday(value: string | null | undefined): string {
  if (!value) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—'
}
