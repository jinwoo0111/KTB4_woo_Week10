import { request } from './http.js'
import {
  createPostRequest,
  createPostUpdateRequest,
  mapPostDetailResponse,
  mapPostListResponse,
  mapPostViewResponse,
  mapPostWriteResponse,
} from './mappers.js'

export async function getPosts({ cursor, size, signal } = {}) {
  const { data } = await request('/posts', {
    query: { cursor, size },
    auth: 'none',
    signal,
  })

  return mapPostListResponse(data)
}

export async function getPost(postId) {
  const { data } = await request(`/posts/${postId}`, {
    auth: 'optional',
  })

  return mapPostDetailResponse(data)
}

export async function increasePostView(postId) {
  const { data } = await request(`/posts/${postId}/views`, {
    method: 'POST',
    auth: 'none',
  })

  return mapPostViewResponse(data)
}

export async function createPost(values) {
  const { data } = await request('/posts', {
    method: 'POST',
    body: createPostRequest(values),
    auth: 'required',
  })

  return mapPostWriteResponse(data)
}

export async function updatePost(postId, values) {
  const { data } = await request(`/posts/${postId}`, {
    method: 'PATCH',
    body: createPostUpdateRequest(values),
    auth: 'required',
  })

  return mapPostWriteResponse(data)
}

export async function deletePost(postId) {
  const { data } = await request(`/posts/${postId}`, {
    method: 'DELETE',
    auth: 'required',
  })

  return data
}

export async function createPostLike(postId) {
  const { data } = await request(`/posts/${postId}/likes`, {
    method: 'POST',
    auth: 'required',
  })

  return data
}

export async function deletePostLike(postId) {
  const { data } = await request(`/posts/${postId}/likes`, {
    method: 'DELETE',
    auth: 'required',
  })

  return data
}
