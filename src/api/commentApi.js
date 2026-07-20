import { request } from './http.js'

function mapComment(data) {
  if (!data) {
    return null
  }

  return {
    commentId: data.comment_id,
    authorId: data.author_id,
    authorNickname: data.author_nickname,
    authorProfileImage: data.author_profile_image ?? null,
    createdAt: data.created_at,
    content: data.content,
  }
}

export async function createComment(postId, { content }) {
  const { data } = await request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
    auth: 'required',
  })

  return mapComment(data)
}

export async function updateComment(postId, commentId, { content }) {
  const { data } = await request(`/posts/${postId}/comments/${commentId}`, {
    method: 'PATCH',
    body: { content },
    auth: 'required',
  })

  return mapComment(data)
}

export async function deleteComment(postId, commentId) {
  const { data } = await request(`/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    auth: 'required',
  })

  return data
}
