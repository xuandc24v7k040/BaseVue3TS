type RoleWithPermissionIds = {
  rolePermissions: Array<{ permission: { id: string } }>;
};

export function collectInheritedPermissionIds(
  roles: readonly RoleWithPermissionIds[],
): Set<string> {
  return new Set(
    roles.flatMap((role) =>
      role.rolePermissions.map(({ permission }) => permission.id),
    ),
  );
}

export function directPermissionIds(
  selectedIds: readonly string[],
  inheritedIds: ReadonlySet<string>,
): string[] {
  return [...new Set(selectedIds)].filter((id) => !inheritedIds.has(id));
}

export function groupPermissionsByResource<T extends { resource: string }>(
  permissions: readonly T[],
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  permissions.forEach((permission) => {
    const group = groups.get(permission.resource) ?? [];
    group.push(permission);
    groups.set(permission.resource, group);
  });
  return [...groups.entries()].sort(([left], [right]) =>
    left.localeCompare(right, "vi"),
  );
}
