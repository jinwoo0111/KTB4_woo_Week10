const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.')
}

let parsedApiBaseUrl

try {
  parsedApiBaseUrl = new URL(apiBaseUrl)
} catch {
  throw new Error('VITE_API_BASE_URL은 올바른 URL이어야 합니다.')
}

if (!['http:', 'https:'].includes(parsedApiBaseUrl.protocol)) {
  throw new Error('VITE_API_BASE_URL은 http 또는 https URL이어야 합니다.')
}

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, '')
