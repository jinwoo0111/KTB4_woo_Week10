import "./feedback-state.css";

function ErrorState({
  message = "요청을 처리하지 못했습니다.",
  retryText = "다시 시도",
  onRetry = null,
  secondaryText = "",
  onSecondary = null,
}) {
  const hasRetryAction = typeof onRetry === "function";
  const hasSecondaryAction = typeof onSecondary === "function";

  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <span className="feedback-state__error-mark" aria-hidden="true">
        !
      </span>
      <p className="feedback-state__message">{message}</p>
      {(hasRetryAction || hasSecondaryAction) && (
        <div className="feedback-state__actions">
          {hasRetryAction && (
            <button
              className="feedback-state__retry-button"
              type="button"
              onClick={onRetry}
            >
              {retryText}
            </button>
          )}
          {hasSecondaryAction && (
            <button
              className="feedback-state__secondary-button"
              type="button"
              onClick={onSecondary}
            >
              {secondaryText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ErrorState;
