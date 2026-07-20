import { request } from './http.js'

function mapComment(data) {
  return {
    commentId: data.comment_id,
    authorId: data.author_id,
    authorNickname: data.author_nickname,
    authorProfileImage: data.author_profile_image ?? null,
    createdAt: data.created_at,
    content: data.content,
  }
}

function mapPostSummary(data) {
  return {
    postId: data.post_id,
    title: data.title,
    createdAt: data.created_at,
    likeCount: data.like_count,
    commentCount: data.comment_count,
    viewCount: data.view_count,
    author: data.author,
    content: data.content,
    contentImage: data.content_image ?? null,
    authorProfileImage: data.author_profile_image ?? null,
  }
}

function mapPostDetail(data) {
  if (!data) {
    return null
  }

  return {
    postId: data.post_id,
    title: data.title,
    createdAt: data.created_at,
    authorId: data.author_id,
    author: data.author,
    authorProfileImage: data.author_profile_image ?? null,
    content: data.content,
    contentImage: data.content_image ?? null,
    likeCount: data.like_count,
    likedByMe: data.liked_by_me,
    commentCount: data.comment_count,
    viewCount: data.view_count,
    comments: Array.isArray(data.comments) ? data.comments.map(mapComment) : [],
  }
}

function mapPostWriteResult(data) {
  if (!data) {
    return null
  }

  return {
    postId: data.post_id,
    title: data.title,
    content: data.content,
    contentImage: data.content_image ?? null,
    ...(data.author === undefined ? {} : { author: data.author }),
  }
}

function buildPostUpdateBody({
  title,
  content,
  contentImage,
  removeContentImage = false,
}) {
  const hasContentImage = contentImage !== null && contentImage !== undefined

  if (
    hasContentImage &&
    (typeof contentImage !== 'string' || !contentImage.trim())
  ) {
    throw new TypeError('게시글 이미지 경로가 올바르지 않습니다.')
  }

  if (hasContentImage && removeContentImage) {
    throw new TypeError('게시글 이미지 교체와 삭제를 동시에 요청할 수 없습니다.')
  }

  const body = { title, content }

  if (hasContentImage) {
    body.content_image = contentImage
  }

  if (removeContentImage) {
    body.remove_content_image = true
  }

  return body
}

export async function getPosts({ cursor, size } = {}) {
  const { data } = await request('/posts', {
    query: { cursor, size },
    auth: 'none',
  })

  return {
    posts: Array.isArray(data?.posts) ? data.posts.map(mapPostSummary) : [],
    count: data?.count ?? 0,
    hasNext: data?.has_next ?? false,
    nextCursor: data?.next_cursor ?? null,
  }
}

export async function getPost(postId) {
  const { data } = await request(`/posts/${postId}`, {
    auth: 'optional',
  })

  return mapPostDetail(data)
}

export async function increasePostView(postId) {
  const { data } = await request(`/posts/${postId}/views`, {
    method: 'POST',
    auth: 'none',
  })

  return {
    viewCount: data?.view_count ?? 0,
  }
}

export async function createPost({ title, content, contentImage = null }) {
  if (
    contentImage !== null &&
    contentImage !== undefined &&
    (typeof contentImage !== 'string' || !contentImage.trim())
  ) {
    throw new TypeError('게시글 이미지 경로가 올바르지 않습니다.')
  }

  const body = {
    title,
    content,
    content_image: contentImage ?? null,
  }

  const { data } = await request('/posts', {
    method: 'POST',
    body,
    auth: 'required',
  })

  return mapPostWriteResult(data)
}

export async function updatePost(postId, values) {
  const { data } = await request(`/posts/${postId}`, {
    method: 'PATCH',
    body: buildPostUpdateBody(values),
    auth: 'required',
  })

  return mapPostWriteResult(data)
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
