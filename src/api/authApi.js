import { request } from './http.js'
import { mapLoginResponse, mapSignupResponse } from './mappers.js'

function assertOptionalFile(file) {
  if (
    file !== null &&
    file !== undefined &&
    (typeof File === 'undefined' || !(file instanceof File))
  ) {
    throw new TypeError('프로필 이미지는 File 객체여야 합니다.')
  }
}

export async function signup({
  email,
  password,
  nickname,
  profileImageFile = null,
}) {
  assertOptionalFile(profileImageFile)

  const formData = new FormData()

  formData.append('email', email)
  formData.append('password', password)
  formData.append('nickname', nickname)

  if (profileImageFile) {
    formData.append('profile_image', profileImageFile)
  }

  const { data } = await request('/users/signup', {
    method: 'POST',
    body: formData,
    auth: 'none',
  })

  return mapSignupResponse(data)
}

export async function login({ email, password }) {
  const { data, authorization } = await request('/users/login', {
    method: 'POST',
    body: { email, password },
    auth: 'none',
  })

  return mapLoginResponse(data, authorization)
}
