import type { RefinementCtx } from 'zod'

type IssuePath = Array<string | number>

export function addDuplicateStringArrayIssues(
  ctx: RefinementCtx,
  values: readonly string[] | undefined,
  path: IssuePath,
  message = 'Danh sach khong duoc co gia tri trung lap.',
): void {
  if (!values) {
    return
  }

  const seenIndexes = new Map<string, number>()

  values.forEach((value, index) => {
    const firstIndex = seenIndexes.get(value)

    if (firstIndex === undefined) {
      seenIndexes.set(value, index)
      return
    }

    ctx.addIssue({
      code: 'custom',
      message,
      path: [...path, index],
    })
  })
}

