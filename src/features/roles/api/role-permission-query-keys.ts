export const rolePermissionKeys = {
  all: ['role-permission-management'] as const,
  lists: () => [...rolePermissionKeys.all, 'list'] as const,
  list: (roleId: string) => [...rolePermissionKeys.lists(), roleId] as const,
}
