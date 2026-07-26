const DEFAULT_API_BASE_URL = '/api'
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL

function normalizeRelativeApiBaseUrl(value) {
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw new Error(
      'VITE_API_BASE_URL 상대 경로는 /로 시작하고 query와 hash를 포함하지 않아야 합니다.',
    )
  }

  const normalizedValue = value.replace(/\/+$/, '')

  if (!normalizedValue) {
    throw new Error('VITE_API_BASE_URL은 루트 경로보다 구체적이어야 합니다.')
  }

  return normalizedValue
}

function normalizeAbsoluteApiBaseUrl(value) {
  let parsedApiBaseUrl

  try {
    parsedApiBaseUrl = new URL(value)
  } catch {
    throw new Error('VITE_API_BASE_URL은 올바른 URL이어야 합니다.')
  }

  if (!['http:', 'https:'].includes(parsedApiBaseUrl.protocol)) {
    throw new Error('VITE_API_BASE_URL은 http 또는 https URL이어야 합니다.')
  }

  if (
    parsedApiBaseUrl.username ||
    parsedApiBaseUrl.password ||
    parsedApiBaseUrl.search ||
    parsedApiBaseUrl.hash
  ) {
    throw new Error(
      'VITE_API_BASE_URL은 인증정보, query, hash를 포함하지 않아야 합니다.',
    )
  }

  return value.replace(/\/+$/, '')
}

export const API_BASE_URL = apiBaseUrl.startsWith('/')
  ? normalizeRelativeApiBaseUrl(apiBaseUrl)
  : normalizeAbsoluteApiBaseUrl(apiBaseUrl)
