import "./toast.css";

function Toast({ message = "", placement = "corner" }) {
  const classes = [
    "toast",
    `toast--${placement}`,
    message ? "is-visible" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export default Toast;
