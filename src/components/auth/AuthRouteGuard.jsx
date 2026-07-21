import { Navigate, Outlet } from "react-router";
import { AUTH_STATUS } from "../../contexts/AuthContext.js";
import { useAuth } from "../../hooks/useAuth.js";
import ErrorState from "../common/ErrorState.jsx";
import LoadingState from "../common/LoadingState.jsx";

function AuthCheckFeedback({ authError, onRetry }) {
  if (authError) {
    return (
      <ErrorState
        message="로그인 상태를 확인하지 못했습니다."
        retryText="다시 확인"
        onRetry={onRetry}
      />
    );
  }

  return <LoadingState message="로그인 상태를 확인하고 있습니다." />;
}

export function RequireAuth() {
  const { authStatus, authError, retryAuthCheck } = useAuth();

  if (authStatus === AUTH_STATUS.CHECKING) {
    return (
      <AuthCheckFeedback
        authError={authError}
        onRetry={retryAuthCheck}
      />
    );
  }

  if (authStatus === AUTH_STATUS.GUEST) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function GuestOnlyRoute() {
  const { authStatus, authError, retryAuthCheck } = useAuth();

  if (authStatus === AUTH_STATUS.CHECKING) {
    return (
      <AuthCheckFeedback
        authError={authError}
        onRetry={retryAuthCheck}
      />
    );
  }

  if (authStatus === AUTH_STATUS.AUTHENTICATED) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
