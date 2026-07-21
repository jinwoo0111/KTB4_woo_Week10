export const POST_TITLE_MAX_LENGTH = 26;
export const POST_IMAGE_MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_POST_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function validatePostTitle(value) {
  const title = value.trim();

  if (!title) {
    return "제목을 입력해주세요.";
  }

  if (title.length > POST_TITLE_MAX_LENGTH) {
    return `제목은 최대 ${POST_TITLE_MAX_LENGTH}자까지 작성 가능합니다.`;
  }

  return "";
}

export function validatePostContent(value) {
  return value.trim() ? "" : "내용을 입력해주세요.";
}

export function validatePostImage(file) {
  if (!file) {
    return "";
  }

  if (!ALLOWED_POST_IMAGE_TYPES.has(file.type)) {
    return "JPG, PNG, GIF, WEBP 이미지만 등록할 수 있습니다.";
  }

  if (file.size > POST_IMAGE_MAX_SIZE) {
    return "게시글 이미지는 10MB 이하만 등록할 수 있습니다.";
  }

  return "";
}
