import { request } from './http.js'
import { createCommentRequest, mapCommentResponse } from './mappers.js'

export async function createComment(postId, { content }) {
  const { data } = await request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: createCommentRequest({ content }),
    auth: 'required',
  })

  return mapCommentResponse(data)
}

export async function updateComment(postId, commentId, { content }) {
  const { data } = await request(`/posts/${postId}/comments/${commentId}`, {
    method: 'PATCH',
    body: createCommentRequest({ content }),
    auth: 'required',
  })

  return mapCommentResponse(data)
}

export async function deleteComment(postId, commentId) {
  const { data } = await request(`/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    auth: 'required',
  })

  return data
}
