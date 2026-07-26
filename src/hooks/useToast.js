import { useCallback, useEffect, useRef, useState } from "react";

export function useToast(defaultDuration = 1800) {
  const timerRef = useRef(null);
  const [message, setMessage] = useState("");

  const clearToast = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setMessage("");
  }, []);

  const showToast = useCallback((nextMessage, duration = defaultDuration) => {
    window.clearTimeout(timerRef.current);
    setMessage(nextMessage);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setMessage("");
    }, duration);
  }, [defaultDuration]);

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
  }, []);

  return {
    clearToast,
    showToast,
    toastMessage: message,
  };
}
