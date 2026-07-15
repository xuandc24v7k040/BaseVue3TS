import 'vue-router'
import type { AuthMeResponseDtoType } from '@/api/generated/models'
import type { AdminPermission } from '@/authorization/admin-permissions'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
    allowedUserTypes?: AuthMeResponseDtoType[]
    skipAuthBootstrap?: boolean
    requiredPermissions?: readonly AdminPermission[]
    requiresSelectedBranch?: boolean
    permissionMode?: 'all' | 'any'
    resolvesAdminHome?: boolean
    pageTitle?: string
    pageDescription?: string
  }
}
