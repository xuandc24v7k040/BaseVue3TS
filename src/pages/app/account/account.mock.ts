import atomicHabits from '@/assets/client/home/books/atomic-habits.svg'
import dacNhanTam from '@/assets/client/home/books/dac-nhan-tam.svg'
import nhaGiaKim from '@/assets/client/home/books/nha-gia-kim.svg'
import sapiens from '@/assets/client/home/books/sapiens.svg'

export interface AccountProfileMock { fullName: string; phone: string; email: string; gender: string; birthday: string; joinedAt: string; defaultAddress: string }
export interface AccountAddressMock { id: number; label: string; fullName: string; phone: string; province: string; district: string; ward: string; detail: string; isDefault: boolean }
export interface AccountFavoriteBookMock { title: string; author: string; price: number; cover: string }

export const accountProfile: AccountProfileMock = {
  fullName: 'Phạm Trường Xuân', phone: '0961518977', email: 'truongshuan0310@gmail.com', gender: '-', birthday: '2003-03-10', joinedAt: '01/01/2025',
  defaultAddress: '31A đường Phạm Văn Nhờ - Khu vực Bình Thạnh B, Phường Bình Thạnh, Thị xã Long Mỹ, Hậu Giang',
}

export const initialAddresses: AccountAddressMock[] = [
  { id: 1, label: 'Nhà', fullName: accountProfile.fullName, phone: accountProfile.phone, province: 'Hậu Giang', district: 'Thị xã Long Mỹ', ward: 'Phường Bình Thạnh', detail: '31A đường Phạm Văn Nhờ - Khu vực Bình Thạnh B', isDefault: true },
  { id: 2, label: 'Văn phòng', fullName: accountProfile.fullName, phone: accountProfile.phone, province: 'Cần Thơ', district: 'Quận Ninh Kiều', ward: 'Phường An Hòa', detail: '72 Nguyễn Văn Cừ', isDefault: false },
  { id: 3, label: 'Nhà ba mẹ', fullName: accountProfile.fullName, phone: accountProfile.phone, province: 'Hậu Giang', district: 'Huyện Châu Thành A', ward: 'Xã Tân Phú Thạnh', detail: 'Ấp Tân Lộc', isDefault: false },
  { id: 4, label: 'Nhà chị gái', fullName: accountProfile.fullName, phone: accountProfile.phone, province: 'Sóc Trăng', district: 'Thành phố Sóc Trăng', ward: 'Phường 5', detail: '15 Trần Hưng Đạo', isDefault: false },
]

export const favoriteBooks: AccountFavoriteBookMock[] = [
  { title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', price: 119000, cover: dacNhanTam },
  { title: 'Atomic Habits', author: 'James Clear', price: 119000, cover: atomicHabits },
  { title: 'Sapiens', author: 'Yuval Noah Harari', price: 119000, cover: sapiens },
  { title: 'Nhà Giả Kim', author: 'Paulo Coelho', price: 119000, cover: nhaGiaKim },
]

export function fullAddress(address: AccountAddressMock): string {
  return [address.detail, address.ward, address.district, address.province].join(', ')
}
