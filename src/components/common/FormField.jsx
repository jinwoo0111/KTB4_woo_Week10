const FIELD_CLASS_NAMES = {
  signup: {
    field: "signup-form__field",
    label: "signup-form__label",
    input: "signup-form__input",
    helper: "signup-form__helper",
  },
  account: {
    field: "user-edit-form__field",
    label: "user-edit-form__label",
    input: "user-edit-form__input",
    helper: "user-edit-form__helper",
  },
};

function FormField({
  variant = "account",
  id,
  label,
  error = "",
  ...inputProps
}) {
  const classNames = FIELD_CLASS_NAMES[variant];

  if (!classNames) {
    throw new TypeError(`지원하지 않는 FormField variant입니다: ${variant}`);
  }

  const errorId = `${id}-error`;

  return (
    <div className={classNames.field}>
      <label className={classNames.label} htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        className={classNames.input}
        id={id}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
      />
      <p
        className={classNames.helper}
        id={errorId}
        aria-live="polite"
      >
        {error}
      </p>
    </div>
  );
}

export default FormField;
