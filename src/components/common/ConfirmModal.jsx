import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import "./confirm-modal.css";

function ConfirmModal({
  isOpen = false,
  title = "계속 진행하시겠습니까?",
  description = "이 작업은 되돌릴 수 없습니다.",
  confirmText = "확인",
  cancelText = "취소",
  isConfirming = false,
  onConfirm = () => {},
  onCancel = () => {},
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocusedElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    cancelButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocusedElement?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !isConfirming) {
      onCancel();
    }
  }

  function handleDialogKeyDown(event) {
    if (event.key === "Escape") {
      if (!isConfirming) {
        onCancel();
      }
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = dialogRef.current?.querySelectorAll(
      "button:not(:disabled)",
    );

    if (!focusableElements?.length) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return createPortal(
    <div className="confirm-modal__overlay" onMouseDown={handleOverlayMouseDown}>
      <div
        ref={dialogRef}
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={isConfirming}
        onKeyDown={handleDialogKeyDown}
      >
        <h2 id={titleId} className="confirm-modal__title">
          {title}
        </h2>
        <p id={descriptionId} className="confirm-modal__description">
          {description}
        </p>

        <div className="confirm-modal__actions">
          <button
            ref={cancelButtonRef}
            className="confirm-modal__button confirm-modal__button--cancel"
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="confirm-modal__button confirm-modal__button--confirm"
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? "처리 중..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmModal;
