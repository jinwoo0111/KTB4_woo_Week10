import { request } from './http.js'
import {
  createPasswordUpdateRequest,
  mapUserResponse,
} from './mappers.js'

function assertOptionalFile(file) {
  if (
    file !== null &&
    file !== undefined &&
    (typeof File === 'undefined' || !(file instanceof File))
  ) {
    throw new TypeError('프로필 이미지는 File 객체여야 합니다.')
  }
}

export async function getCurrentUser() {
  const { data } = await request('/users/me', {
    auth: 'required',
  })

  return mapUserResponse(data)
}

export async function updateUser(userId, {
  nickname = null,
  profileImageFile = null,
  removeProfileImage = false,
}) {
  assertOptionalFile(profileImageFile)

  if (profileImageFile && removeProfileImage) {
    throw new TypeError('프로필 이미지 교체와 삭제를 동시에 요청할 수 없습니다.')
  }

  const formData = new FormData()

  if (nickname !== null && nickname !== undefined) {
    formData.append('nickname', nickname)
  }

  if (profileImageFile) {
    formData.append('profile_image', profileImageFile)
  }

  if (removeProfileImage) {
    formData.append('remove_profile_image', 'true')
  }

  const { data } = await request(`/users/${userId}`, {
    method: 'PATCH',
    body: formData,
    auth: 'required',
  })

  return mapUserResponse(data)
}

export async function updatePassword(userId, { newPassword }) {
  const { data } = await request(`/users/${userId}/password`, {
    method: 'PATCH',
    body: createPasswordUpdateRequest({ newPassword }),
    auth: 'required',
  })

  return data
}

export async function deleteUser(userId) {
  const { data } = await request(`/users/${userId}`, {
    method: 'DELETE',
    auth: 'required',
  })

  return data
}
