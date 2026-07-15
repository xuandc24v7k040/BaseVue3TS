export type GeolocationFailure =
  | 'unsupported'
  | 'insecure'
  | 'permission'
  | 'unavailable'
  | 'timeout'
  | 'aborted'

export interface BrowserLocation {
  latitude: number
  longitude: number
}

export interface BrowserLocationOptions {
  signal?: AbortSignal
}

type GeolocationPermissionState = PermissionState | 'unsupported'
type GeolocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN'

interface GeolocationDiagnostic {
  supported: boolean
  secureContext: boolean
  permissionState: GeolocationPermissionState
  attempt: 1 | 2
  highAccuracy: boolean
  timeoutMs: number
  maximumAgeMs: number
  elapsedMs: number
  errorCode?: number
  errorType?: GeolocationErrorType
  errorMessage?: string
}

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 30_000,
}

const FALLBACK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20_000,
  maximumAge: 300_000,
}

let activeLocationRequest: Promise<BrowserLocation> | null = null

export function geolocationMessage(reason: GeolocationFailure): string {
  if (reason === 'unsupported') return 'Trình duyệt không hỗ trợ định vị.'
  if (reason === 'insecure') return 'Định vị chỉ hoạt động trên HTTPS hoặc localhost.'
  if (reason === 'permission') {
    return 'Bạn chưa cấp quyền truy cập vị trí. Hãy bật quyền vị trí cho trang hoặc chọn trực tiếp trên bản đồ.'
  }
  if (reason === 'timeout') {
    return 'Không thể lấy vị trí trong thời gian cho phép. Vui lòng thử lại hoặc chọn trực tiếp trên bản đồ.'
  }
  if (reason === 'aborted') return 'Yêu cầu định vị đã được hủy.'
  return 'Không thể xác định vị trí hiện tại. Bạn vẫn có thể chọn trực tiếp trên bản đồ.'
}

function mapPositionError(error: GeolocationPositionError): GeolocationFailure {
  if (error.code === 1) return 'permission'
  if (error.code === 3) return 'timeout'
  return 'unavailable'
}

function diagnosticErrorType(code: number): GeolocationErrorType {
  if (code === 1) return 'PERMISSION_DENIED'
  if (code === 2) return 'POSITION_UNAVAILABLE'
  if (code === 3) return 'TIMEOUT'
  return 'UNKNOWN'
}

function logDiagnostic(diagnostic: GeolocationDiagnostic, failed = false): void {
  if (!import.meta.env.DEV) return
  console.groupCollapsed(`[Bookora] Geolocation attempt ${diagnostic.attempt}`)
  if (failed) console.error(diagnostic)
  else console.info(diagnostic)
  console.groupEnd()
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt))
}

function requestPosition(
  options: PositionOptions,
  attempt: 1 | 2,
  permission: GeolocationPermissionState,
  signal?: AbortSignal,
): Promise<BrowserLocation> {
  const supported = Boolean(navigator.geolocation)
  const secureContext = globalThis.isSecureContext !== false
  const startedAt = performance.now()
  const baseDiagnostic = {
    supported,
    secureContext,
    permissionState: permission,
    attempt,
    highAccuracy: Boolean(options.enableHighAccuracy),
    timeoutMs: options.timeout ?? 0,
    maximumAgeMs: options.maximumAge ?? 0,
  } satisfies Omit<GeolocationDiagnostic, 'elapsedMs'>

  return new Promise((resolve, reject: (reason: GeolocationFailure) => void) => {
    if (signal?.aborted) {
      reject('aborted')
      return
    }
    let settled = false
    const abort = () => {
      if (settled) return
      settled = true
      reject('aborted')
    }
    signal?.addEventListener('abort', abort, { once: true })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (settled || signal?.aborted) return
        settled = true
        signal?.removeEventListener('abort', abort)
        logDiagnostic({ ...baseDiagnostic, elapsedMs: elapsedSince(startedAt) })
        resolve({ latitude: coords.latitude, longitude: coords.longitude })
      },
      (error) => {
        if (settled || signal?.aborted) return
        settled = true
        signal?.removeEventListener('abort', abort)
        logDiagnostic({
          ...baseDiagnostic,
          elapsedMs: elapsedSince(startedAt),
          errorCode: error.code,
          errorType: diagnosticErrorType(error.code),
          errorMessage: error.message,
        }, true)
        reject(mapPositionError(error))
      },
      options,
    )
  })
}

async function permissionState(): Promise<GeolocationPermissionState> {
  if (!navigator.permissions?.query) return 'unsupported'
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state
  } catch {
    return 'unsupported'
  }
}

async function locate(signal?: AbortSignal): Promise<BrowserLocation> {
  const supported = Boolean(navigator.geolocation)
  const secureContext = globalThis.isSecureContext !== false
  const permission = await permissionState()
  const preflightDiagnostic = (failure: GeolocationFailure): void => {
    logDiagnostic({
      supported,
      secureContext,
      permissionState: permission,
      attempt: 1,
      highAccuracy: Boolean(HIGH_ACCURACY_OPTIONS.enableHighAccuracy),
      timeoutMs: HIGH_ACCURACY_OPTIONS.timeout ?? 0,
      maximumAgeMs: HIGH_ACCURACY_OPTIONS.maximumAge ?? 0,
      elapsedMs: 0,
      errorType: failure === 'permission' ? 'PERMISSION_DENIED' : 'UNKNOWN',
      errorMessage: failure,
    }, true)
  }

  if (!supported) {
    preflightDiagnostic('unsupported')
    throw 'unsupported' satisfies GeolocationFailure
  }
  if (!secureContext) {
    preflightDiagnostic('insecure')
    throw 'insecure' satisfies GeolocationFailure
  }
  if (permission === 'denied') {
    preflightDiagnostic('permission')
    throw 'permission' satisfies GeolocationFailure
  }

  try {
    return await requestPosition(HIGH_ACCURACY_OPTIONS, 1, permission, signal)
  } catch (reason) {
    if (reason !== 'timeout' && reason !== 'unavailable') throw reason
    return requestPosition(FALLBACK_OPTIONS, 2, permission, signal)
  }
}

export function getBrowserLocation(options: BrowserLocationOptions = {}): Promise<BrowserLocation> {
  if (activeLocationRequest) return activeLocationRequest
  activeLocationRequest = locate(options.signal).finally(() => {
    activeLocationRequest = null
  })
  return activeLocationRequest
}
