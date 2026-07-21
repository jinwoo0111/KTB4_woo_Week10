import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../api/ApiError.js";
import { useAuth } from "../hooks/useAuth.js";
import {
  validateEmail,
  validatePassword,
} from "../utils/validation.js";
import "./login-page.css";

const LOGIN_FAIL_MESSAGE = "아이디 또는 비밀번호를 확인해주세요.";
const NETWORK_ERROR_MESSAGE = "서버와 연결할 수 없습니다.";
const LOGIN_PROCESS_ERROR_MESSAGE = "로그인을 처리하지 못했습니다. 다시 시도해주세요.";

function getLoginErrorMessage(error) {
  if (error instanceof ApiError) {
    if (error.message === "network_error") {
      return NETWORK_ERROR_MESSAGE;
    }

    if (error.status === 401 || error.message === "login_failed") {
      return LOGIN_FAIL_MESSAGE;
    }
  }

  return LOGIN_PROCESS_ERROR_MESSAGE;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldErrors = useMemo(() => ({
    email: validateEmail(email),
    password: validatePassword(password),
  }), [email, password]);

  const isFormValid = !fieldErrors.email && !fieldErrors.password;

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
    setSubmitError("");
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    setSubmitError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setTouched({ email: true, password: true });
    setSubmitError("");

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password: password.trim(),
      });
      navigate("/", { replace: true });
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="login-card" aria-labelledby="login-title">
      <p className="login-card__kicker">RESCENE FAN COMMUNITY</p>
      <h1 className="login-card__title" id="login-title">
        로그인
      </h1>

      <form className="login-form" noValidate onSubmit={handleSubmit}>
        <div className="login-form__field">
          <label className="login-form__label" htmlFor="login-email">
            이메일
          </label>
          <input
            className="login-form__input"
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="이메일을 입력하세요"
            value={email}
            aria-describedby="login-email-error"
            aria-invalid={touched.email && Boolean(fieldErrors.email)}
            disabled={isSubmitting}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            onChange={handleEmailChange}
          />
          <p
            className="login-form__helper"
            id="login-email-error"
            aria-live="polite"
          >
            {touched.email ? fieldErrors.email : ""}
          </p>
        </div>

        <div className="login-form__field">
          <label className="login-form__label" htmlFor="login-password">
            비밀번호
          </label>
          <input
            className="login-form__input"
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            aria-describedby="login-password-error"
            aria-invalid={touched.password && Boolean(fieldErrors.password)}
            disabled={isSubmitting}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            onChange={handlePasswordChange}
          />
          <p
            className="login-form__helper"
            id="login-password-error"
            aria-live="polite"
          >
            {touched.password ? fieldErrors.password : ""}
          </p>
        </div>

        <p
          className="login-form__submit-error"
          role={submitError ? "alert" : undefined}
        >
          {submitError}
        </p>

        <button
          className={`login-form__submit${isFormValid ? " is-ready" : ""}`}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>

        <button
          className="login-form__signup-link"
          type="button"
          disabled={isSubmitting}
          onClick={() => navigate("/signup")}
        >
          회원가입
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
