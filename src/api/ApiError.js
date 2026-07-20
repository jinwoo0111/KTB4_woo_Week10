const DEFAULT_MESSAGE = 'api_request_failed'

export class ApiError extends Error {
  constructor({
    status = null,
    message = DEFAULT_MESSAGE,
    data = null,
    cause,
  } = {}) {
    super(message, cause === undefined ? undefined : { cause })

    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}
