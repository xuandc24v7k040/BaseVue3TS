import { nextTick } from 'vue'

export async function focusFirstInvalidField(formId: string): Promise<void> {
  await nextTick()
  const field = document
    .getElementById(formId)
    ?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!field) return

  field.scrollIntoView?.({ block: 'nearest' })
  field.focus()
}
