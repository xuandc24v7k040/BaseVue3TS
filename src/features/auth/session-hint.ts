const SESSION_HINT_KEY = 'bookora.session_hint'
const SESSION_HINT_VALUE = '1'

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function hasSessionHint(): boolean {
  return getStorage()?.getItem(SESSION_HINT_KEY) === SESSION_HINT_VALUE
}

export function setSessionHint(): void {
  getStorage()?.setItem(SESSION_HINT_KEY, SESSION_HINT_VALUE)
}

export function clearSessionHint(): void {
  getStorage()?.removeItem(SESSION_HINT_KEY)
}
