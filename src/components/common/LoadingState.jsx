import "./feedback-state.css";

function LoadingState({ message = "불러오는 중입니다." }) {
  return (
    <div className="feedback-state" role="status" aria-live="polite">
      <span className="feedback-state__spinner" aria-hidden="true" />
      <p className="feedback-state__message">{message}</p>
    </div>
  );
}

export default LoadingState;
