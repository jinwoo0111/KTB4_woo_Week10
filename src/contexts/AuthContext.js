import { createContext } from "react";

export const AUTH_STATUS = Object.freeze({
  CHECKING: "checking",
  AUTHENTICATED: "authenticated",
  GUEST: "guest",
});

export const AuthContext = createContext(null);

AuthContext.displayName = "AuthContext";
