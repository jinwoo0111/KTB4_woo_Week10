const authInvalidationListeners = new Set()

export function subscribeToAuthInvalidation(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('인증 무효화 구독자는 함수여야 합니다.')
  }

  authInvalidationListeners.add(listener)

  return () => {
    authInvalidationListeners.delete(listener)
  }
}

export function notifyAuthInvalidated(accessToken) {
  for (const listener of authInvalidationListeners) {
    listener(accessToken)
  }
}
