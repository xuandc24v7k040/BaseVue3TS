import { describe, expect, it } from 'vitest'
import { createRoleColumns } from './role-columns'

describe('role columns', () => {
  it('exposes every contract data column as server-sortable', () => {
    const columns = createRoleColumns()
    const ids = columns.map((column) => 'accessorKey' in column ? column.accessorKey : column.id)
    expect(ids).toEqual(['code', 'name', 'description', 'type', 'guardName', 'level', 'isSystem', 'isActive', 'createdAt', 'updatedAt'])
    expect(columns.every((column) => column.enableSorting !== false)).toBe(true)
  })
})
