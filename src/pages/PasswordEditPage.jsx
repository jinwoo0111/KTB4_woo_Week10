import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/ApiError.js";
import { updatePassword as requestUpdatePassword } from "../api/userApi.js";
import ProfileImage from "../components/common/ProfileImage.jsx";
import MyPageSidebar from "../components/mypage/MyPageSidebar.jsx";
import { useAuth } from "../hooks/useAuth.js";
import {
  validatePassword,
  validatePasswordConfirm,
} from "../utils/validation.js";
import "./user-edit-page.css";
import "./password-edit-page.css";

const TOAST_DURATION = 1800;

function getPasswordUpdateErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return "비밀번호를 수정하지 못했습니다. 다시 시도해주세요.";
  }

  if (error.message === "network_error") {
    return "서버와 연결할 수 없습니다.";
  }

  if (error.message === "invalid_request") {
    return "새 비밀번호를 확인해주세요.";
  }

  return "비밀번호 수정에 실패했습니다. 다시 시도해주세요.";
}

function PasswordEditPage() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const toastTimerRef = useRef(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [touched, setTouched] = useState({
    password: false,
    passwordConfirm: false,
  });
  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
  }, []);

  const fieldErrors = useMemo(() => ({
    password: validatePassword(password),
    passwordConfirm: validatePasswordConfirm(password, passwordConfirm),
  }), [password, passwordConfirm]);
  const isFormValid = !fieldErrors.password && !fieldErrors.passwordConfirm;

  const showToast = (message) => {
    window.clearTimeout(toastTimerRef.current);
    setToastMessage(message);

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, TOAST_DURATION);
  };

  const handleFieldChange = (field, value) => {
    if (field === "password") {
      setPassword(value);
    } else {
      setPasswordConfirm(value);
    }

    setSubmitError("");
  };

  const handleFieldBlur = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ password: true, passwordConfirm: true });
    setSubmitError("");

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await requestUpdatePassword(currentUser.userId, {
        newPassword: password.trim(),
      });

      setPassword("");
      setPasswordConfirm("");
      setTouched({ password: false, passwordConfirm: false });
      showToast("비밀번호가 수정되었습니다.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      setSubmitError(getPasswordUpdateErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="user-edit-page">
      <header className="user-edit-page__intro">
        <h1 className="user-edit-page__title">MY PAGE</h1>
      </header>

      <div className="user-edit-page__layout">
        <MyPageSidebar isBusy={isSubmitting} onLogout={handleLogout} />

        <section className="user-edit-card" aria-labelledby="password-edit-title">
          <div className="user-edit-card__topline">
            <span>PROFILE / 02</span>
            <span className="user-edit-card__status">REMINE</span>
          </div>

          <div className="password-edit-card__summary">
            <ProfileImage
              className="password-edit-card__profile-image"
              src={currentUser.profileImage}
              alt="현재 프로필 이미지"
            />

            <div className="user-edit-card__identity">
              <p className="user-edit-card__identity-label">INFO</p>
              <h2 className="user-edit-card__display-name" id="password-edit-title">
                {currentUser.nickname || "회원님"}
              </h2>
              <p className="user-edit-card__email">{currentUser.email}</p>
            </div>
          </div>

          <div className="user-edit-card__divider" />

          <form className="password-edit-form" noValidate onSubmit={handleSubmit}>
            <div className="user-edit-form__heading">
              <p>SECURITY</p>
              <span>02 / 02</span>
            </div>

            <div className="user-edit-form__field">
              <label className="user-edit-form__label" htmlFor="new-password">
                새 비밀번호
              </label>
              <input
                className="user-edit-form__input"
                id="new-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="새 비밀번호를 입력하세요"
                value={password}
                aria-describedby="new-password-error"
                aria-invalid={touched.password && Boolean(fieldErrors.password)}
                disabled={isSubmitting}
                onBlur={() => handleFieldBlur("password")}
                onChange={(event) => handleFieldChange("password", event.target.value)}
              />
              <p
                className="user-edit-form__helper"
                id="new-password-error"
                aria-live="polite"
              >
                {touched.password ? fieldErrors.password : ""}
              </p>
            </div>

            <div className="user-edit-form__field">
              <label
                className="user-edit-form__label"
                htmlFor="new-password-confirm"
              >
                새 비밀번호 확인
              </label>
              <input
                className="user-edit-form__input"
                id="new-password-confirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                placeholder="새 비밀번호를 한번 더 입력하세요"
                value={passwordConfirm}
                aria-describedby="new-password-confirm-error"
                aria-invalid={
                  touched.passwordConfirm && Boolean(fieldErrors.passwordConfirm)
                }
                disabled={isSubmitting}
                onBlur={() => handleFieldBlur("passwordConfirm")}
                onChange={(event) => (
                  handleFieldChange("passwordConfirm", event.target.value)
                )}
              />
              <p
                className="user-edit-form__helper"
                id="new-password-confirm-error"
                aria-live="polite"
              >
                {touched.passwordConfirm ? fieldErrors.passwordConfirm : ""}
              </p>
            </div>

            <p
              className="user-edit-form__submit-error"
              role={submitError ? "alert" : undefined}
            >
              {submitError}
            </p>

            <button
              className="user-edit-form__submit password-edit-form__submit"
              type="submit"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "저장 중..." : "비밀번호 저장"}
            </button>
          </form>
        </section>
      </div>

      <div
        className={`user-edit-toast${toastMessage ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toastMessage}
      </div>
    </div>
  );
}

export default PasswordEditPage;
