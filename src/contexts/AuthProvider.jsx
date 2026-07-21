import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { login as requestLogin } from "../api/authApi.js";
import { ApiError } from "../api/ApiError.js";
import { getCurrentUser } from "../api/userApi.js";
import {
  getAccessToken,
  removeAccessToken,
  saveAccessToken,
} from "../utils/tokenStorage.js";
import { AUTH_STATUS, AuthContext } from "./AuthContext.js";

function createGuestAuthState() {
  return {
    accessToken: null,
    authStatus: AUTH_STATUS.GUEST,
    currentUser: null,
    authError: null,
  };
}

function createInitialAuthState() {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return createGuestAuthState();
  }

  return {
    accessToken,
    authStatus: AUTH_STATUS.CHECKING,
    currentUser: null,
    authError: null,
  };
}

function assertCurrentUser(currentUser) {
  if (!currentUser) {
    throw new ApiError({ message: "current_user_missing" });
  }
}

function ignoreHandledAuthError() {
  // startAuthCheck가 오류를 guest 상태 또는 authError에 이미 반영한다.
}

function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(createInitialAuthState);
  const authCheckRef = useRef(null);

  const handleAuthCheckError = useCallback((error, tokenBeingChecked) => {
    if (error instanceof ApiError && error.status === 401) {
      removeAccessToken();

      setAuthState((currentState) => {
        if (currentState.accessToken !== tokenBeingChecked) {
          return currentState;
        }

        return createGuestAuthState();
      });
      return;
    }

    setAuthState((currentState) => {
      if (currentState.accessToken !== tokenBeingChecked) {
        return currentState;
      }

      if (
        currentState.authStatus === AUTH_STATUS.AUTHENTICATED &&
        currentState.currentUser
      ) {
        return {
          ...currentState,
          authError: error,
        };
      }

      return {
        ...currentState,
        authStatus: AUTH_STATUS.CHECKING,
        currentUser: null,
        authError: error,
      };
    });
  }, []);

  const startAuthCheck = useCallback((accessToken, { force = false } = {}) => {
    if (
      !force &&
      authCheckRef.current?.token === accessToken
    ) {
      return authCheckRef.current.promise;
    }

    let authCheckPromise;

    authCheckPromise = getCurrentUser()
      .then((currentUser) => {
        if (authCheckRef.current?.promise !== authCheckPromise) {
          throw new ApiError({ message: "auth_check_cancelled" });
        }

        assertCurrentUser(currentUser);

        setAuthState((currentState) => {
          if (currentState.accessToken !== accessToken) {
            return currentState;
          }

          return {
            accessToken,
            authStatus: AUTH_STATUS.AUTHENTICATED,
            currentUser,
            authError: null,
          };
        });

        return currentUser;
      })
      .catch((error) => {
        if (authCheckRef.current?.promise === authCheckPromise) {
          handleAuthCheckError(error, accessToken);
        }

        throw error;
      });

    authCheckRef.current = {
      token: accessToken,
      promise: authCheckPromise,
    };

    return authCheckPromise;
  }, [handleAuthCheckError]);

  useEffect(() => {
    if (!authState.accessToken) {
      return;
    }

    startAuthCheck(authState.accessToken).catch(ignoreHandledAuthError);
  }, [authState.accessToken, startAuthCheck]);

  const retryAuthCheck = useCallback(() => {
    const accessToken = authState.accessToken;

    if (!accessToken) {
      return;
    }

    setAuthState((currentState) => ({
      ...currentState,
      authStatus: currentState.currentUser
        ? currentState.authStatus
        : AUTH_STATUS.CHECKING,
      authError: null,
    }));

    startAuthCheck(accessToken, { force: true }).catch(ignoreHandledAuthError);
  }, [authState.accessToken, startAuthCheck]);

  const login = useCallback(async (credentials) => {
    const { authorization } = await requestLogin(credentials);

    saveAccessToken(authorization);

    const accessToken = getAccessToken();

    if (!accessToken) {
      removeAccessToken();
      throw new Error("저장된 access token을 확인할 수 없습니다.");
    }

    setAuthState({
      accessToken,
      authStatus: AUTH_STATUS.CHECKING,
      currentUser: null,
      authError: null,
    });

    return startAuthCheck(accessToken, { force: true });
  }, [startAuthCheck]);

  const logout = useCallback(() => {
    authCheckRef.current = null;
    removeAccessToken();
    setAuthState(createGuestAuthState());
  }, []);

  const refreshCurrentUser = useCallback(() => {
    const accessToken = authState.accessToken;

    if (!accessToken) {
      throw new ApiError({
        status: 401,
        message: "authentication_required",
      });
    }

    setAuthState((currentState) => ({
      ...currentState,
      authError: null,
    }));

    return startAuthCheck(accessToken, { force: true });
  }, [authState.accessToken, startAuthCheck]);

  const updateCurrentUser = useCallback((currentUser) => {
    if (
      !currentUser ||
      typeof currentUser !== "object" ||
      Array.isArray(currentUser)
    ) {
      throw new TypeError("갱신할 현재 사용자 정보가 올바르지 않습니다.");
    }

    setAuthState((currentState) => {
      if (currentState.authStatus !== AUTH_STATUS.AUTHENTICATED) {
        return currentState;
      }

      return {
        ...currentState,
        currentUser,
        authError: null,
      };
    });
  }, []);

  const contextValue = useMemo(() => ({
    ...authState,
    login,
    logout,
    refreshCurrentUser,
    retryAuthCheck,
    updateCurrentUser,
  }), [
    authState,
    login,
    logout,
    refreshCurrentUser,
    retryAuthCheck,
    updateCurrentUser,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
