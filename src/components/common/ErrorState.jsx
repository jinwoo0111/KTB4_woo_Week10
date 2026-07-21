import "./feedback-state.css";

function ErrorState({
  message = "요청을 처리하지 못했습니다.",
  retryText = "다시 시도",
  onRetry = null,
}) {
  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <span className="feedback-state__error-mark" aria-hidden="true">
        !
      </span>
      <p className="feedback-state__message">{message}</p>
      {typeof onRetry === "function" && (
        <button
          className="feedback-state__retry-button"
          type="button"
          onClick={onRetry}
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

export default ErrorState;
