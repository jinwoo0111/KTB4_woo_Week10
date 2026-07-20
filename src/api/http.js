import { API_BASE_URL } from '../config/env.js'
import {
  getAccessToken,
  removeAccessToken,
} from '../utils/tokenStorage.js'
import { ApiError } from './ApiError.js'

const AUTH_MODES = new Set(['none', 'optional', 'required'])

function buildUrl(path, query) {
  if (typeof path !== 'string' || !path.trim()) {
    throw new TypeError('API 요청 경로가 올바르지 않습니다.')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalizedPath}`)

  if (!query) {
    return url
  }

  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value]

    for (const item of values) {
      if (item !== null && item !== undefined) {
        url.searchParams.append(key, String(item))
      }
    }
  }

  return url
}

function buildRequestHeaders(headers, token) {
  const requestHeaders = new Headers(headers)

  requestHeaders.delete('Authorization')

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  return requestHeaders
}

function buildRequestBody(body, headers) {
  if (body === undefined) {
    return undefined
  }

  if (body instanceof FormData) {
    headers.delete('Content-Type')
    return body
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return JSON.stringify(body)
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null
  }

  const text = await response.text()

  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isEnvelope(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }

  return (
    Object.hasOwn(payload, 'message') || Object.hasOwn(payload, 'data')
  )
}

function normalizeResponse(response, payload) {
  const envelope = isEnvelope(payload)

  return {
    status: response.status,
    message: envelope ? payload.message ?? null : null,
    data: envelope ? payload.data ?? null : payload,
    authorization: response.headers.get('Authorization'),
  }
}

function createHttpError(response, payload) {
  const envelope = isEnvelope(payload)
  const message =
    envelope && typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : undefined

  return new ApiError({
    status: response.status,
    message,
    data: envelope ? payload.data ?? null : payload,
  })
}

async function sendRequest(path, options, token, canRetryWithoutAuth) {
  const {
    method = 'GET',
    query,
    body,
    headers,
    signal,
  } = options

  if (typeof method !== 'string' || !method.trim()) {
    throw new TypeError('HTTP method가 올바르지 않습니다.')
  }

  const url = buildUrl(path, query)
  const requestHeaders = buildRequestHeaders(headers, token)
  const requestBody = buildRequestBody(body, requestHeaders)

  let response
  let payload

  try {
    response = await fetch(url, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: requestBody,
      signal,
    })
    payload = await parseResponseBody(response)
  } catch (cause) {
    throw new ApiError({ message: 'network_error', cause })
  }

  if (response.status === 401 && canRetryWithoutAuth) {
    removeAccessToken()
    return sendRequest(path, options, null, false)
  }

  if (!response.ok) {
    throw createHttpError(response, payload)
  }

  return normalizeResponse(response, payload)
}

export function request(path, options = {}) {
  const { auth = 'none' } = options

  if (!AUTH_MODES.has(auth)) {
    throw new TypeError('auth는 none, optional, required 중 하나여야 합니다.')
  }

  const token = auth === 'none' ? null : getAccessToken()
  const canRetryWithoutAuth = auth === 'optional' && Boolean(token)

  return sendRequest(path, options, token, canRetryWithoutAuth)
}
