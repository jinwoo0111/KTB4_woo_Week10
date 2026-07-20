const ACCESS_TOKEN_KEY = 'accessToken'

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function normalizeAccessToken(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  const token = trimmedValue.replace(/^Bearer(?:\s+|$)/i, '').trim()

  return token || null
}

export function getAccessToken() {
  const storage = getLocalStorage()

  if (!storage) {
    return null
  }

  try {
    return normalizeAccessToken(storage.getItem(ACCESS_TOKEN_KEY))
  } catch {
    return null
  }
}

export function saveAccessToken(value) {
  const token = normalizeAccessToken(value)

  if (!token) {
    throw new TypeError('저장할 access token이 올바르지 않습니다.')
  }

  const storage = getLocalStorage()

  if (!storage) {
    throw new Error('브라우저 저장소를 사용할 수 없습니다.')
  }

  storage.setItem(ACCESS_TOKEN_KEY, token)
}

export function removeAccessToken() {
  const storage = getLocalStorage()

  if (!storage) {
    return
  }

  try {
    storage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    // 저장소 오류가 로그아웃의 나머지 상태 정리를 막지 않게 한다.
  }
}
