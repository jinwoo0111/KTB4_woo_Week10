import { request } from './http.js'
import {
  createPasswordUpdateRequest,
  createUserUpdateRequest,
  mapUserResponse,
} from './mappers.js'

export async function getCurrentUser() {
  const { data } = await request('/users/me', {
    auth: 'required',
  })

  return mapUserResponse(data)
}

export async function updateUser(userId, values) {
  const { data } = await request(`/users/${userId}`, {
    method: 'PATCH',
    body: createUserUpdateRequest(values),
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
