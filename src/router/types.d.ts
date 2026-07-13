import 'vue-router'
import type { AuthMeResponseDtoType } from '@/api/generated/models'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    allowedUserTypes?: AuthMeResponseDtoType[]
    skipAuthBootstrap?: boolean
    requiredPermissions?: string[]
    requiresSelectedBranch?: boolean
  }
}
