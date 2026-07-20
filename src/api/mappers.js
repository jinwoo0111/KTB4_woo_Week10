function assertImagePath(imagePath, label) {
  if (
    imagePath !== null &&
    imagePath !== undefined &&
    (typeof imagePath !== 'string' || !imagePath.trim())
  ) {
    throw new TypeError(`${label} 경로가 올바르지 않습니다.`)
  }
}

export function mapSignupResponse(data) {
  return {
    userId: data?.user_id ?? null,
  }
}

export function mapLoginResponse(data, authorization) {
  return {
    userId: data?.user_id ?? null,
    authorization,
  }
}

export function mapUserResponse(data) {
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

export function createUserUpdateRequest({
  nickname,
  profileImage,
  removeProfileImage = false,
}) {
  const hasProfileImage = profileImage !== null && profileImage !== undefined

  assertImagePath(profileImage, '프로필 이미지')

  if (hasProfileImage && removeProfileImage) {
    throw new TypeError('프로필 이미지 교체와 삭제를 동시에 요청할 수 없습니다.')
  }

  const request = { nickname }

  if (hasProfileImage) {
    request.profile_image = profileImage
  }

  if (removeProfileImage) {
    request.remove_profile_image = true
  }

  return request
}

export function createPasswordUpdateRequest({ newPassword }) {
  return {
    new_password: newPassword,
  }
}

export function mapCommentResponse(data) {
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

export function createCommentRequest({ content }) {
  return { content }
}

export function mapPostSummaryResponse(data) {
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

export function mapPostListResponse(data) {
  return {
    posts: Array.isArray(data?.posts)
      ? data.posts.map(mapPostSummaryResponse)
      : [],
    count: data?.count ?? 0,
    hasNext: data?.has_next ?? false,
    nextCursor: data?.next_cursor ?? null,
  }
}

export function mapPostDetailResponse(data) {
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
    comments: Array.isArray(data.comments)
      ? data.comments.map(mapCommentResponse)
      : [],
  }
}

export function mapPostWriteResponse(data) {
  if (!data) {
    return null
  }

  const response = {
    postId: data.post_id,
    title: data.title,
    content: data.content,
    contentImage: data.content_image ?? null,
  }

  if (data.author !== undefined) {
    response.author = data.author
  }

  return response
}

export function mapPostViewResponse(data) {
  return {
    viewCount: data?.view_count ?? 0,
  }
}

export function createPostRequest({
  title,
  content,
  contentImage = null,
}) {
  assertImagePath(contentImage, '게시글 이미지')

  return {
    title,
    content,
    content_image: contentImage ?? null,
  }
}

export function createPostUpdateRequest({
  title,
  content,
  contentImage,
  removeContentImage = false,
}) {
  const hasContentImage = contentImage !== null && contentImage !== undefined

  assertImagePath(contentImage, '게시글 이미지')

  if (hasContentImage && removeContentImage) {
    throw new TypeError('게시글 이미지 교체와 삭제를 동시에 요청할 수 없습니다.')
  }

  const request = { title, content }

  if (hasContentImage) {
    request.content_image = contentImage
  }

  if (removeContentImage) {
    request.remove_content_image = true
  }

  return request
}

export function mapUploadResponse(data) {
  return data?.path ?? null
}
