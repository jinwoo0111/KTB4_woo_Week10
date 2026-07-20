import { request } from './http.js'

function mapUser(data) {
  if (!data) {
    return null
  }

  return {
    userId: data.user_id,
    email: data.email,
    nickname: data.nickname,
    profileImage: data.profile_image ?? null,
  }
}

function buildUserUpdateBody({
  nickname,
  profileImage,
  removeProfileImage = false,
}) {
  const hasProfileImage = profileImage !== null && profileImage !== undefined

  if (
    hasProfileImage &&
    (typeof profileImage !== 'string' || !profileImage.trim())
  ) {
    throw new TypeError('프로필 이미지 경로가 올바르지 않습니다.')
  }

  if (hasProfileImage && removeProfileImage) {
    throw new TypeError('프로필 이미지 교체와 삭제를 동시에 요청할 수 없습니다.')
  }

  const body = { nickname }

  if (hasProfileImage) {
    body.profile_image = profileImage
  }

  if (removeProfileImage) {
    body.remove_profile_image = true
  }

  return body
}

export async function getCurrentUser() {
  const { data } = await request('/users/me', {
    auth: 'required',
  })

  return mapUser(data)
}

export async function updateUser(userId, values) {
  const { data } = await request(`/users/${userId}`, {
    method: 'PATCH',
    body: buildUserUpdateBody(values),
    auth: 'required',
  })

  return mapUser(data)
}

export async function updatePassword(userId, { newPassword }) {
  const { data } = await request(`/users/${userId}/password`, {
    method: 'PATCH',
    body: {
      new_password: newPassword,
    },
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
