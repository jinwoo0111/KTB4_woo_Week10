export const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_IMAGE_TYPE_SET = new Set(ALLOWED_IMAGE_TYPES);

export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

export function validateImageFile(file, { label = "이미지" } = {}) {
  if (!file) {
    return "";
  }

  if (!ALLOWED_IMAGE_TYPE_SET.has(file.type)) {
    return "JPG, PNG, GIF, WEBP 이미지만 등록할 수 있습니다.";
  }

  if (file.size > IMAGE_MAX_SIZE) {
    return `${label}는 10MB 이하만 등록할 수 있습니다.`;
  }

  return "";
}

export function validatePostImage(file) {
  return validateImageFile(file, { label: "게시글 이미지" });
}

export function validateProfileImage(file) {
  return validateImageFile(file, { label: "프로필 이미지" });
}
