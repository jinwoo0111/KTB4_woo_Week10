import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/ApiError.js";
import { signup as requestSignup } from "../api/authApi.js";
import defaultProfileImage from "../assets/rescene-default-profile.jpg";
import {
  validateEmail,
  validateNickname,
  validatePassword,
  validatePasswordConfirm,
} from "../utils/validation.js";
import "./signup-page.css";

const SUCCESS_TOAST_DURATION = 1200;
const INVALID_TOAST_DURATION = 1600;
const EMPTY_SERVER_ERRORS = {
  email: "",
  nickname: "",
  profileImage: "",
};

function getSignupErrorFeedback(error) {
  if (!(error instanceof ApiError)) {
    return { form: "회원가입을 처리하지 못했습니다. 다시 시도해주세요." };
  }

  switch (error.message) {
    case "email_already_exists":
      return { field: "email", message: "중복된 이메일입니다." };
    case "nickname_already_exists":
      return { field: "nickname", message: "중복된 닉네임입니다." };
    case "image_file_too_large":
      return {
        field: "profileImage",
        message: "프로필 이미지는 10MB 이하만 등록할 수 있습니다.",
      };
    case "image_type_not_allowed":
      return {
        field: "profileImage",
        message: "JPG, PNG, GIF, WEBP 이미지만 등록할 수 있습니다.",
      };
    case "image_file_empty":
      return {
        field: "profileImage",
        message: "선택한 이미지 파일을 확인해주세요.",
      };
    case "network_error":
      return { form: "서버와 연결할 수 없습니다." };
    default:
      return { form: "회원가입에 실패했습니다. 다시 시도해주세요." };
  }
}

function SignupPage() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const previewUrlRef = useRef(null);
  const toastTimerRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState(defaultProfileImage);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    passwordConfirm: false,
    nickname: false,
  });
  const [serverErrors, setServerErrors] = useState(EMPTY_SERVER_ERRORS);
  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    window.clearTimeout(toastTimerRef.current);
    window.clearTimeout(redirectTimerRef.current);
  }, []);

  const fieldErrors = useMemo(() => ({
    email: validateEmail(email),
    password: validatePassword(password),
    passwordConfirm: validatePasswordConfirm(password, passwordConfirm),
    nickname: validateNickname(nickname),
  }), [email, nickname, password, passwordConfirm]);

  const displayedErrors = {
    email: serverErrors.email || (touched.email ? fieldErrors.email : ""),
    password: touched.password ? fieldErrors.password : "",
    passwordConfirm: touched.passwordConfirm
      ? fieldErrors.passwordConfirm
      : "",
    nickname:
      serverErrors.nickname || (touched.nickname ? fieldErrors.nickname : ""),
  };

  const isFormValid = Object.values(fieldErrors).every((message) => !message);

  const showToast = (message, duration) => {
    window.clearTimeout(toastTimerRef.current);
    setToastMessage(message);

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, duration);
  };

  const clearRequestFeedback = () => {
    setSubmitError("");
  };

  const clearServerError = (field) => {
    setServerErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setProfileImageFile(file);
    clearServerError("profileImage");
    clearRequestFeedback();

    if (!file) {
      setProfilePreviewUrl(defaultProfileImage);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setProfilePreviewUrl(previewUrl);
  };

  const handleFieldChange = (field, value) => {
    const setters = {
      email: setEmail,
      password: setPassword,
      passwordConfirm: setPasswordConfirm,
      nickname: setNickname,
    };

    setters[field](value);
    clearRequestFeedback();

    if (field === "email" || field === "nickname") {
      clearServerError(field);
    }
  };

  const handleFieldBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const focusField = (field) => {
    window.requestAnimationFrame(() => {
      formRef.current?.elements.namedItem(field)?.focus();
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setTouched({
      email: true,
      password: true,
      passwordConfirm: true,
      nickname: true,
    });
    setServerErrors(EMPTY_SERVER_ERRORS);
    setSubmitError("");

    if (!isFormValid || isSubmitting) {
      if (!isFormValid) {
        const firstInvalidField = Object.keys(fieldErrors).find(
          (field) => fieldErrors[field],
        );

        showToast("입력값을 확인해주세요.", INVALID_TOAST_DURATION);

        if (firstInvalidField) {
          focusField(firstInvalidField);
        }
      }

      return;
    }

    setIsSubmitting(true);

    try {
      await requestSignup({
        email: email.trim(),
        password: password.trim(),
        nickname: nickname.trim(),
        profileImageFile,
      });

      showToast("회원가입 성공", SUCCESS_TOAST_DURATION);
      redirectTimerRef.current = window.setTimeout(() => {
        navigate("/", { replace: true });
      }, SUCCESS_TOAST_DURATION);
    } catch (error) {
      const feedback = getSignupErrorFeedback(error);

      if (feedback.field) {
        setServerErrors((current) => ({
          ...current,
          [feedback.field]: feedback.message,
        }));

        if (feedback.field !== "profileImage") {
          focusField(feedback.field);
        }
      } else {
        setSubmitError(feedback.form);
      }

      setIsSubmitting(false);
    }
  };

  return (
    <section className="signup-card" aria-labelledby="signup-title">
      <p className="signup-card__kicker">RESCENE FAN COMMUNITY</p>
      <h1 className="signup-card__title" id="signup-title">
        회원가입
      </h1>

      <form ref={formRef} className="signup-form" noValidate onSubmit={handleSubmit}>
        <div className="signup-form__profile-section">
          <span className="signup-form__label">프로필 사진</span>
          <label className="signup-form__profile-upload" htmlFor="signup-profile-image">
            <img
              className="signup-form__profile-preview"
              src={profilePreviewUrl}
              alt={profileImageFile ? "선택한 프로필 이미지 미리보기" : "기본 프로필 이미지"}
            />
            <span className="signup-form__profile-edit-badge">EDIT</span>
          </label>
          <input
            className="signup-form__profile-input"
            id="signup-profile-image"
            name="profileImage"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            aria-describedby="signup-profile-message"
            disabled={isSubmitting}
            onChange={handleProfileImageChange}
          />
          <p
            className={`signup-form__profile-message${serverErrors.profileImage ? " is-error" : ""}`}
            id="signup-profile-message"
            aria-live="polite"
          >
            {serverErrors.profileImage || "프로필 사진은 선택사항입니다."}
          </p>
        </div>

        <div className="signup-form__field">
          <label className="signup-form__label" htmlFor="signup-email">
            이메일
          </label>
          <input
            className="signup-form__input"
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="이메일을 입력하세요"
            value={email}
            aria-describedby="signup-email-error"
            aria-invalid={Boolean(displayedErrors.email)}
            disabled={isSubmitting}
            onBlur={() => handleFieldBlur("email")}
            onChange={(event) => handleFieldChange("email", event.target.value)}
          />
          <p className="signup-form__helper" id="signup-email-error" aria-live="polite">
            {displayedErrors.email}
          </p>
        </div>

        <div className="signup-form__field">
          <label className="signup-form__label" htmlFor="signup-password">
            비밀번호
          </label>
          <input
            className="signup-form__input"
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            aria-describedby="signup-password-error"
            aria-invalid={Boolean(displayedErrors.password)}
            disabled={isSubmitting}
            onBlur={() => handleFieldBlur("password")}
            onChange={(event) => handleFieldChange("password", event.target.value)}
          />
          <p className="signup-form__helper" id="signup-password-error" aria-live="polite">
            {displayedErrors.password}
          </p>
        </div>

        <div className="signup-form__field">
          <label className="signup-form__label" htmlFor="signup-password-confirm">
            비밀번호 확인
          </label>
          <input
            className="signup-form__input"
            id="signup-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 한번 더 입력하세요"
            value={passwordConfirm}
            aria-describedby="signup-password-confirm-error"
            aria-invalid={Boolean(displayedErrors.passwordConfirm)}
            disabled={isSubmitting}
            onBlur={() => handleFieldBlur("passwordConfirm")}
            onChange={(event) => handleFieldChange("passwordConfirm", event.target.value)}
          />
          <p
            className="signup-form__helper"
            id="signup-password-confirm-error"
            aria-live="polite"
          >
            {displayedErrors.passwordConfirm}
          </p>
        </div>

        <div className="signup-form__field">
          <label className="signup-form__label" htmlFor="signup-nickname">
            닉네임
          </label>
          <input
            className="signup-form__input"
            id="signup-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            placeholder="닉네임을 입력하세요"
            value={nickname}
            aria-describedby="signup-nickname-error"
            aria-invalid={Boolean(displayedErrors.nickname)}
            disabled={isSubmitting}
            onBlur={() => handleFieldBlur("nickname")}
            onChange={(event) => handleFieldChange("nickname", event.target.value)}
          />
          <p className="signup-form__helper" id="signup-nickname-error" aria-live="polite">
            {displayedErrors.nickname}
          </p>
        </div>

        <p
          className="signup-form__submit-error"
          role={submitError ? "alert" : undefined}
        >
          {submitError}
        </p>

        <button
          className={`signup-form__submit${isFormValid ? " is-ready" : ""}`}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "회원가입 중..." : "회원가입"}
        </button>

        <button
          className="signup-form__login-link"
          type="button"
          disabled={isSubmitting}
          onClick={() => navigate("/login")}
        >
          로그인하러 가기
        </button>
      </form>

      <div
        className={`signup-toast${toastMessage ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </section>
  );
}

export default SignupPage;
