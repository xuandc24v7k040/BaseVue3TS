import { z } from 'zod'
import {
  BranchesCreateBody,
  branchesCreateBodyLatitudeMax,
  branchesCreateBodyLatitudeMin,
  branchesCreateBodyLongitudeMax,
  branchesCreateBodyLongitudeMin,
} from '@/api/generated/zod/branches/branches'

const requiredText = (label: string) => z.string().trim().min(1, `${label} không được để trống`)
const BRANCH_CODE_PATTERN = /^[a-z][a-z0-9-]*$/
const VIETNAM_PHONE_PATTERN = /^(?:0|\+84)(?:[ .-]?\d){9,10}$/

export const BRANCH_CODE_FORMAT_MESSAGE = 'Mã chi nhánh phải bắt đầu bằng chữ thường và chỉ gồm chữ thường, số hoặc dấu gạch ngang (-).'
export const BRANCH_PHONE_REQUIRED_MESSAGE = 'Số điện thoại là bắt buộc.'
export const BRANCH_PHONE_FORMAT_MESSAGE = 'Số điện thoại không đúng định dạng Việt Nam.'

const branchFormDraftSchema = BranchesCreateBody.omit({
  latitude: true,
  longitude: true,
}).extend({
  code: requiredText('Mã chi nhánh').regex(BRANCH_CODE_PATTERN, BRANCH_CODE_FORMAT_MESSAGE),
  name: requiredText('Tên chi nhánh'),
  phone: z.string()
    .trim()
    .min(1, BRANCH_PHONE_REQUIRED_MESSAGE)
    .regex(VIETNAM_PHONE_PATTERN, BRANCH_PHONE_FORMAT_MESSAGE),
  province: requiredText('Tỉnh/Thành phố'),
  ward: requiredText('Phường/Xã'),
  address: requiredText('Địa chỉ chi tiết'),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  isActive: z.boolean(),
})

export const branchFormSchema = branchFormDraftSchema
  .superRefine((value, context) => {
    const { latitude, longitude } = value
    if (latitude === null && longitude === null) return
    if (latitude === null || longitude === null) {
      context.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'Vui lòng nhập đầy đủ vĩ độ và kinh độ.',
      })
      return
    }
    if (latitude === 0 && longitude === 0) {
      context.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'Tọa độ 0, 0 không phải vị trí hợp lệ của chi nhánh tại Việt Nam.',
      })
      return
    }
    if (latitude < branchesCreateBodyLatitudeMin || latitude > branchesCreateBodyLatitudeMax) {
      context.addIssue({
        code: 'custom',
        path: ['latitude'],
        message: 'Vĩ độ phải nằm trong khoảng từ -90 đến 90.',
      })
    }
    if (longitude < branchesCreateBodyLongitudeMin || longitude > branchesCreateBodyLongitudeMax) {
      context.addIssue({
        code: 'custom',
        path: ['longitude'],
        message: 'Kinh độ phải nằm trong khoảng từ -180 đến 180.',
      })
    }
  })

export type BranchFormPayload = z.infer<typeof branchFormSchema>
