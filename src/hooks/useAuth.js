import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext.js";

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth는 AuthProvider 내부에서 사용해야 합니다.");
  }

  return context;
}
