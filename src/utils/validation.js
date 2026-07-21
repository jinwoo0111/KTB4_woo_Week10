const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,20}$/;

const VALIDATION_MESSAGES = {
  emailRequired: "이메일을 입력해주세요.",
  emailInvalid:
    "올바른 이메일 주소 형식을 입력해주세요. (예: jw@naver.com)",
  passwordRequired: "비밀번호를 입력해주세요.",
  passwordInvalid:
    "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.",
  passwordConfirmRequired: "비밀번호를 한번 더 입력해주세요.",
  passwordMismatch: "비밀번호가 다릅니다.",
  nicknameRequired: "닉네임을 입력해주세요.",
  nicknameHasWhitespace: "띄어쓰기를 없애주세요.",
  nicknameTooLong: "닉네임은 최대 10자까지 작성 가능합니다.",
};

export function validateEmail(value) {
  const email = value.trim();

  if (!email) {
    return VALIDATION_MESSAGES.emailRequired;
  }

  if (!EMAIL_REGEX.test(email)) {
    return VALIDATION_MESSAGES.emailInvalid;
  }

  return "";
}

export function validatePassword(value) {
  const password = value.trim();

  if (!password) {
    return VALIDATION_MESSAGES.passwordRequired;
  }

  if (!PASSWORD_REGEX.test(password)) {
    return VALIDATION_MESSAGES.passwordInvalid;
  }

  return "";
}

export function validatePasswordConfirm(passwordValue, confirmValue) {
  const password = passwordValue.trim();
  const passwordConfirm = confirmValue.trim();

  if (!passwordConfirm) {
    return VALIDATION_MESSAGES.passwordConfirmRequired;
  }

  if (password !== passwordConfirm) {
    return VALIDATION_MESSAGES.passwordMismatch;
  }

  return "";
}

export function validateNickname(value) {
  const nickname = value.trim();

  if (!nickname) {
    return VALIDATION_MESSAGES.nicknameRequired;
  }

  if (/\s/.test(value)) {
    return VALIDATION_MESSAGES.nicknameHasWhitespace;
  }

  if (nickname.length > 10) {
    return VALIDATION_MESSAGES.nicknameTooLong;
  }

  return "";
}
