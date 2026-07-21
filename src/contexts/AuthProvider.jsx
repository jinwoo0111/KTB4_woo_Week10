import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/ApiError.js";
import { getCurrentUser } from "../api/userApi.js";
import {
  getAccessToken,
  removeAccessToken,
} from "../utils/tokenStorage.js";
import { AUTH_STATUS, AuthContext } from "./AuthContext.js";

function createInitialAuthState() {
  const accessToken = getAccessToken();

  return {
    accessToken,
    authStatus: accessToken
      ? AUTH_STATUS.CHECKING
      : AUTH_STATUS.GUEST,
    currentUser: null,
    authError: null,
  };
}

function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(createInitialAuthState);
  const [authCheckAttempt, setAuthCheckAttempt] = useState(0);
  const authCheckRef = useRef(null);

  const retryAuthCheck = useCallback(() => {
    authCheckRef.current = null;

    setAuthState((currentState) => {
      if (!currentState.accessToken) {
        return currentState;
      }

      return {
        ...currentState,
        authStatus: AUTH_STATUS.CHECKING,
        currentUser: null,
        authError: null,
      };
    });
    setAuthCheckAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  useEffect(() => {
    const tokenBeingChecked = authState.accessToken;

    if (!tokenBeingChecked) {
      return undefined;
    }

    if (authCheckRef.current?.token !== tokenBeingChecked) {
      authCheckRef.current = {
        token: tokenBeingChecked,
        promise: getCurrentUser(),
      };
    }

    const currentAuthCheck = authCheckRef.current.promise;
    let isActive = true;

    currentAuthCheck
      .then((currentUser) => {
        if (!isActive) {
          return;
        }

        if (!currentUser) {
          throw new ApiError({ message: "current_user_missing" });
        }

        setAuthState((currentState) => {
          if (currentState.accessToken !== tokenBeingChecked) {
            return currentState;
          }

          return {
            accessToken: tokenBeingChecked,
            authStatus: AUTH_STATUS.AUTHENTICATED,
            currentUser,
            authError: null,
          };
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          removeAccessToken();

          setAuthState((currentState) => {
            if (currentState.accessToken !== tokenBeingChecked) {
              return currentState;
            }

            return {
              accessToken: null,
              authStatus: AUTH_STATUS.GUEST,
              currentUser: null,
              authError: null,
            };
          });
          return;
        }

        setAuthState((currentState) => {
          if (currentState.accessToken !== tokenBeingChecked) {
            return currentState;
          }

          return {
            ...currentState,
            authStatus: AUTH_STATUS.CHECKING,
            currentUser: null,
            authError: error,
          };
        });
      });

    return () => {
      isActive = false;
    };
  }, [authState.accessToken, authCheckAttempt]);

  const contextValue = {
    ...authState,
    retryAuthCheck,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
