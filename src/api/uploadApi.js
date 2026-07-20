import { request } from './http.js'

function assertFile(file) {
  if (typeof File === 'undefined' || !(file instanceof File)) {
    throw new TypeError('업로드할 이미지는 File 객체여야 합니다.')
  }
}

async function uploadImage(category, file) {
  assertFile(file)

  const formData = new FormData()
  formData.append('file', file)

  const { data } = await request(`/uploads/${category}`, {
    method: 'POST',
    body: formData,
    auth: 'required',
  })

  return data?.path ?? null
}

export function uploadProfileImage(file) {
  return uploadImage('profile', file)
}

export function uploadPostImage(file) {
  return uploadImage('post', file)
}
