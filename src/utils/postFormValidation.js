export const POST_TITLE_MAX_LENGTH = 26;

export {
  IMAGE_ACCEPT,
  IMAGE_MAX_SIZE as POST_IMAGE_MAX_SIZE,
  validatePostImage,
} from "./imageValidation.js";

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
