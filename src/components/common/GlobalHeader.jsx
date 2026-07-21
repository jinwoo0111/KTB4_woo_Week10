import { Link, NavLink } from "react-router";
import { AUTH_STATUS } from "../../contexts/AuthContext.js";
import { useAuth } from "../../hooks/useAuth.js";
import HeaderProfileButton from "./HeaderProfileButton.jsx";
import "./global-header.css";

const NAVIGATION_ITEMS = [
  { label: "HOME", to: "/", end: true },
  { label: "ARTIST", to: "/artist", end: true },
  { label: "COMMUNITY", to: "/posts", end: false },
];

function getNavigationClassName({ isActive }) {
  return ["global-header__nav-link", isActive ? "is-active" : ""]
    .filter(Boolean)
    .join(" ");
}

function HeaderAuthControl({
  authStatus,
  currentUser,
  authError,
  onRetry,
}) {
  if (authStatus === AUTH_STATUS.CHECKING) {
    if (authError) {
      return (
        <button
          className="global-header__auth-state global-header__auth-state--error"
          type="button"
          title="로그인 상태 다시 확인"
          aria-label="로그인 상태 확인에 실패했습니다. 다시 시도"
          onClick={onRetry}
        >
          <span aria-hidden="true">!</span>
        </button>
      );
    }

    return (
      <span
        className="global-header__auth-state global-header__auth-state--checking"
        role="status"
        aria-live="polite"
      >
        <span className="global-header__auth-spinner" aria-hidden="true" />
        <span className="global-header__visually-hidden">
          로그인 상태 확인 중
        </span>
      </span>
    );
  }

  const isAuthenticated = authStatus === AUTH_STATUS.AUTHENTICATED;

  return (
    <HeaderProfileButton
      isAuthenticated={isAuthenticated}
      profileImage={isAuthenticated ? currentUser?.profileImage : null}
      nickname={isAuthenticated ? currentUser?.nickname : ""}
    />
  );
}

function GlobalHeader() {
  const {
    authStatus,
    currentUser,
    authError,
    retryAuthCheck,
  } = useAuth();

  return (
    <header className="global-header">
      <div className="global-header__inner">
        <Link className="global-header__logo" to="/">
          RESCENE FAN COMMUNITY
        </Link>

        <nav className="global-header__navigation" aria-label="주요 메뉴">
          {NAVIGATION_ITEMS.map(({ label, to, end }) => (
            <NavLink
              key={to}
              className={getNavigationClassName}
              to={to}
              end={end}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <HeaderAuthControl
          authStatus={authStatus}
          currentUser={currentUser}
          authError={authError}
          onRetry={retryAuthCheck}
        />
      </div>
    </header>
  );
}

export default GlobalHeader;
