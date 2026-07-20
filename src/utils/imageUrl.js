import { API_BASE_URL } from '../config/env.js'

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i
const UPLOAD_PATH_PATTERN = /^\/?uploads(?:\/|$)/

export function resolveImageUrl(imagePath) {
  if (typeof imagePath !== 'string') {
    return null
  }

  const trimmedPath = imagePath.trim()

  if (!trimmedPath) {
    return null
  }

  if (ABSOLUTE_HTTP_URL_PATTERN.test(trimmedPath)) {
    return trimmedPath
  }

  if (UPLOAD_PATH_PATTERN.test(trimmedPath)) {
    const normalizedPath = `/${trimmedPath.replace(/^\/+/, '')}`
    return `${API_BASE_URL}${normalizedPath}`
  }

  return trimmedPath
}
